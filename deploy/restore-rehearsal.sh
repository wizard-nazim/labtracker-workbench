#!/usr/bin/env bash
# $POSTGRES_* in single quotes expand inside the db container, on purpose.
# shellcheck disable=SC2016
#
# Proves a backup can be restored, without touching the live app: restores it
# into a separate, throwaway Compose project ("labtracker-rehearsal") with its
# own containers, volumes and networks, then checks it:
#   - every container healthy and /health answering through nginx
#   - row counts of every table, side by side with the live database
#   - every photo recorded in the database actually loads from storage
#   - the live containers were not restarted
# The rehearsal listens on 127.0.0.1:$REHEARSAL_PORT only, and is removed
# afterwards unless --keep is given.
#
#   deploy/restore-rehearsal.sh                       # newest complete backup
#   deploy/restore-rehearsal.sh /srv/labtracker/backups/20261101T023000Z
#   deploy/restore-rehearsal.sh --keep [backup]       # leave it running to browse
#   deploy/restore-rehearsal.sh --down                # remove a kept rehearsal
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
REHEARSAL_PORT=${REHEARSAL_PORT:-18088}
rehearsal=labtracker-rehearsal
live=(docker compose -p labtracker -f docker-compose.prod.yml --env-file .env.production)
reh=(docker compose -p "$rehearsal" -f docker-compose.prod.yml --env-file .env.production)

# The rehearsal must never publish on the live address. Shell variables win
# over .env.production, so these apply to the rehearsal's commands only.
export WEB_BIND=127.0.0.1 WEB_PORT=$REHEARSAL_PORT

keep=false
case ${1:-} in
  --down)
    "${reh[@]}" down -v --remove-orphans
    echo "==> Rehearsal removed."
    exit 0 ;;
  --keep) keep=true; shift ;;
esac

dir=${1:-$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '2*Z' | sort | tail -n 1)}
[[ -n $dir && -d $dir ]] || { echo "No backup found; pass a backup directory." >&2; exit 1; }
dir=$(cd "$dir" && pwd)

# Two copies of the stack need roughly 1.5 GB of free memory.
avail_mb=$(awk '/MemAvailable/ { print int($2 / 1024) }' /proc/meminfo 2> /dev/null || true)
if [[ -n $avail_mb ]] && (( avail_mb < 1500 )); then
  echo "Only ${avail_mb} MB of memory available; need about 1500 MB for a rehearsal." >&2
  exit 1
fi
if ss -Htln "sport = :$REHEARSAL_PORT" | grep -q .; then
  echo "Port $REHEARSAL_PORT is in use; set REHEARSAL_PORT to a free one." >&2
  exit 1
fi

live_started() {
  docker ps --filter label=com.docker.compose.project=labtracker \
    --format '{{.Names}}' | sort | xargs -r docker inspect -f '{{.Name}} {{.State.StartedAt}}'
}
before=$(live_started)

echo "==> Rehearsing restore of $(basename "$dir") into '$rehearsal' (127.0.0.1:$REHEARSAL_PORT)"
"${reh[@]}" down -v --remove-orphans > /dev/null 2>&1 || true
# Whatever happens from here, don't leave a second copy of the stack running.
cleanup() { $keep || "${reh[@]}" down -v --remove-orphans > /dev/null 2>&1 || true; }
trap cleanup EXIT
LABTRACKER_PROJECT=$rehearsal deploy/restore.sh "$dir" --yes

failures=0
fail() { echo "    FAIL: $*"; failures=$(( failures + 1 )); }

echo "==> Checks"
base="http://127.0.0.1:$REHEARSAL_PORT"
if curl -fsS "$base/health" > /dev/null; then echo "    ok: /health through nginx"; else fail "/health through nginx"; fi

# Exact row counts of every table in the public schema, as "table|count".
counts() {
  "$@" exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA' <<'SQL'
SELECT format('SELECT %L || ''|'' || count(*) FROM %I', tablename, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename \gexec
SQL
}
restored_counts=$(counts "${reh[@]}")
live_counts=$(counts "${live[@]}" 2> /dev/null || true)
[[ -n $restored_counts ]] || fail "could not count rows in the restored database"
echo "    rows: table | restored | live now"
while IFS='|' read -r table n; do
  now=$(grep -E "^$table\|" <<< "$live_counts" | cut -d'|' -f2)
  note=""
  [[ -n $now && $now != "$n" ]] && note="  (changed since the backup)"
  printf '      %-26s %8s %8s%s\n' "$table" "$n" "${now:--}" "$note"
done <<< "$restored_counts"
users=$(grep -E '^Users\|' <<< "$restored_counts" | cut -d'|' -f2)
[[ ${users:-0} -gt 0 ]] || fail "restored database has no users"

keys=$("${reh[@]}" exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "SELECT \"BlobKey\" FROM \"EquipmentImages\""')
total=0 missing=0
while read -r key; do
  [[ -z $key ]] && continue
  total=$(( total + 1 ))
  code=$(curl -s -o /dev/null -w '%{http_code}' "$base/storage/labtracker-equipment/$key" || true)
  [[ $code == 200 ]] || { missing=$(( missing + 1 )); echo "      missing photo ($code): $key"; }
done <<< "$keys"
if (( missing == 0 )); then echo "    ok: all $total photos load"; else fail "$missing of $total photos missing"; fi

if [[ $(live_started) == "$before" ]]; then echo "    ok: live containers untouched"; else fail "live container start times changed"; fi

if $keep; then
  echo "==> Left running. From your laptop: ssh -L $REHEARSAL_PORT:127.0.0.1:$REHEARSAL_PORT <server>,"
  echo "    browse http://localhost:$REHEARSAL_PORT, then remove it with: deploy/restore-rehearsal.sh --down"
else
  cleanup
  echo "==> Rehearsal removed."
fi

if (( failures > 0 )); then
  echo "==> REHEARSAL FAILED ($failures problem(s)) for $(basename "$dir")" >&2
  exit 1
fi
echo "==> REHEARSAL PASSED for $(basename "$dir")"
