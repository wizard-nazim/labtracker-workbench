#!/usr/bin/env bash
# $POSTGRES_* in single quotes expand inside the db container, on purpose.
# shellcheck disable=SC2016
#
# Backs up Postgres (pg_dump, custom format) and Garage (its metadata and data
# volumes) into $BACKUP_ROOT/<UTC timestamp>/. Garage is stopped for the few
# seconds the copy takes (see docs/deploy-homelab.md for why), so photo
# uploads and photo loads fail briefly; everything else keeps working.
#
# A run writes to <timestamp>.partial and renames it only when everything
# succeeded, so a directory without .partial is always a complete backup.
# It refuses to start when the disk is nearly full, and afterwards deletes
# complete backups older than $KEEP_DAYS while always keeping the newest
# $KEEP_MIN. On success it updates $BACKUP_ROOT/last-success, which
# deploy/monitor.sh checks. Safe to run from a timer.
#
# These backups sit on the same disk as the data; deploy/offsite-backup.sh
# copies them off the server, encrypted.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
KEEP_MIN=${KEEP_MIN:-7}
# Free space that must remain after a backup, on top of room for one.
MIN_FREE_MB=${MIN_FREE_MB:-5120}
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
project=labtracker
# Already on the host (it's the db image), and it has tar and gzip.
tool_image=postgres:16-alpine

umask 077
mkdir -p "$BACKUP_ROOT"

# One backup at a time (the timer, deploy.sh and manual runs can overlap).
exec 9> "$BACKUP_ROOT/.lock"
if ! flock -n 9; then
  echo "Another backup is already running." >&2
  exit 1
fi

# Complete backups, oldest first (timestamp names sort chronologically).
complete_backups() {
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '2*Z' | sort
}

latest=$(complete_backups | tail -n 1)
latest_kb=0
[[ -n $latest ]] && latest_kb=$(du -sk "$latest" | cut -f1)
free_kb=$(df -Pk "$BACKUP_ROOT" | awk 'NR == 2 { print $4 }')
needed_kb=$(( MIN_FREE_MB * 1024 + 2 * latest_kb ))
if (( free_kb < needed_kb )); then
  echo "Not enough disk space: $(( free_kb / 1024 )) MB free, need $(( needed_kb / 1024 )) MB." >&2
  echo "Delete old backups or Docker images (docs/deploy-homelab.md, section 9)." >&2
  exit 1
fi

name=$(date -u +%Y%m%dT%H%M%SZ)
work="$BACKUP_ROOT/$name.partial"
dir="$BACKUP_ROOT/$name"
mkdir "$work"

echo "==> Database -> $dir/db.dump"
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$work/db.dump"
# A dump that pg_restore can't list is broken; fail loudly instead of keeping it.
"${compose[@]}" exec -T db pg_restore --list < "$work/db.dump" > /dev/null

echo "==> Object storage -> $dir/storage.tar.gz"
restart_storage() { "${compose[@]}" start storage > /dev/null; }
trap restart_storage EXIT
paused_at=$(date +%s)
"${compose[@]}" stop storage > /dev/null
docker run --rm \
  -v "${project}_garage_meta:/meta:ro" \
  -v "${project}_garage_data:/data:ro" \
  -v "$work:/backup" \
  "$tool_image" tar czf /backup/storage.tar.gz -C / meta data
restart_storage
trap - EXIT
echo "    storage was paused for $(( $(date +%s) - paused_at ))s"

git rev-parse --short HEAD > "$work/app-version" 2>/dev/null || true
(cd "$work" && sha256sum db.dump storage.tar.gz > SHA256SUMS)
mv "$work" "$dir"
echo "$name" > "$BACKUP_ROOT/last-success"

# Retention: never touches the newest $KEEP_MIN, whatever their age.
complete_backups | head -n -"$KEEP_MIN" | while read -r old; do
  if [[ -n $(find "$old" -maxdepth 0 -mtime +"$KEEP_DAYS") ]]; then
    rm -rf "$old"
    echo "    deleted old backup $(basename "$old")"
  fi
done
# Leftovers of runs that failed part-way.
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '*.partial' -mmin +1440 -exec rm -rf {} +

echo "==> Backup complete: $dir ($(du -sh "$dir" | cut -f1); $(( free_kb / 1024 )) MB were free)"
