#!/usr/bin/env bash
# Health check for the timer in deploy/systemd (every 10 minutes). Prints one
# summary line for the journal; exits 1 and lists the problems when:
#   - a container isn't running and healthy, or /health fails through nginx
#   - a filesystem (/, Docker's data, backups) is over $DISK_MAX_PCT % full
#   - available memory is under $MEM_MIN_MB MB
#   - the last successful local backup (or off-site backup, once configured)
#     is older than $BACKUP_MAX_AGE_H hours
# Container checks are skipped while a backup or deploy holds its lock, since
# both briefly stop containers on purpose. If PING_URL is set in $ALERT_ENV,
# each fully healthy run pings it, so an outside service (e.g. Healthchecks.io)
# can alert when the pings stop because the whole server is down.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
DISK_MAX_PCT=${DISK_MAX_PCT:-85}
MEM_MIN_MB=${MEM_MIN_MB:-400}
BACKUP_MAX_AGE_H=${BACKUP_MAX_AGE_H:-26}
OFFSITE_ENV=${OFFSITE_ENV:-/etc/labtracker/offsite.env}
ALERT_ENV=${ALERT_ENV:-/etc/labtracker/alert.env}
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
problems=()

env_value() { grep -E "^$1=" .env.production | tail -n 1 | cut -d= -f2- | tr -d "\"'"; }
lock_busy() { [[ -e $1 ]] && ! flock -n "$1" true; }
hours_since() { echo $(( ($(date +%s) - $(stat -c %Y "$1")) / 3600 )); }

if lock_busy "$BACKUP_ROOT/.lock" || lock_busy "$BACKUP_ROOT/.deploy.lock"; then
  containers="skipped (backup or deploy running)"
else
  containers="healthy"
  for svc in db storage api web; do
    id=$("${compose[@]}" ps -q "$svc" 2> /dev/null || true)
    if [[ -z $id ]]; then
      problems+=("$svc: not running"); containers="PROBLEM"; continue
    fi
    state=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$id")
    [[ $state == running/healthy ]] || { problems+=("$svc: $state"); containers="PROBLEM"; }
  done
  url="http://$(env_value WEB_BIND):$(env_value WEB_PORT)/health"
  curl -fsS -m 10 -o /dev/null "$url" || problems+=("$url failed")
fi

disks=""
docker_root=$(docker info -f '{{.DockerRootDir}}' 2> /dev/null || true)
while read -r path; do
  [[ -d $path ]] || continue
  pct=$(df --output=pcent "$path" | tail -n 1 | tr -dc '0-9')
  disks+="$path ${pct}% "
  (( pct <= DISK_MAX_PCT )) || problems+=("disk $path is ${pct}% full (limit ${DISK_MAX_PCT}%)")
done < <(printf '%s\n' / "$docker_root" "$BACKUP_ROOT" | sort -u)

mem=$(awk '/MemAvailable/ { print int($2 / 1024) }' /proc/meminfo 2> /dev/null || true)
if [[ -z $mem ]]; then
  mem="n/a"
else
  (( mem >= MEM_MIN_MB )) || problems+=("only ${mem} MB memory available")
  mem+=" MB"
fi

backup="none yet"
if [[ -f $BACKUP_ROOT/last-success ]]; then
  backup="$(hours_since "$BACKUP_ROOT/last-success")h ago"
  (( $(hours_since "$BACKUP_ROOT/last-success") <= BACKUP_MAX_AGE_H )) \
    || problems+=("last successful backup was $backup")
else
  problems+=("no successful backup recorded in $BACKUP_ROOT/last-success")
fi

offsite="not configured"
if [[ -f $OFFSITE_ENV ]]; then
  if [[ -f $BACKUP_ROOT/offsite-last-success ]]; then
    offsite="$(hours_since "$BACKUP_ROOT/offsite-last-success")h ago"
    (( $(hours_since "$BACKUP_ROOT/offsite-last-success") <= BACKUP_MAX_AGE_H )) \
      || problems+=("last successful off-site backup was $offsite")
  else
    offsite="none yet"
    problems+=("off-site backup configured but never succeeded")
  fi
fi

usage=$(docker stats --no-stream --format '{{.Name}}={{.MemUsage}}' 2> /dev/null \
  | grep -E '^labtracker-(db|storage|api|web)-1=' | sed -E 's/^labtracker-([a-z]+)-1=([^ ]+) .*/\1 \2/' | paste -sd, - || true)

echo "containers: $containers | disk: ${disks% }| mem available: $mem | backup: $backup | off-site: $offsite | usage: ${usage:-n/a}"

if (( ${#problems[@]} > 0 )); then
  printf 'PROBLEM: %s\n' "${problems[@]}" >&2
  exit 1
fi

if [[ -r $ALERT_ENV ]]; then
  # shellcheck source=/dev/null
  PING_URL=$(. "$ALERT_ENV"; echo "${PING_URL:-}")
  [[ -z $PING_URL ]] || curl -fsS -m 10 --retry 2 -o /dev/null "$PING_URL" || echo "warning: ping to PING_URL failed" >&2
fi
