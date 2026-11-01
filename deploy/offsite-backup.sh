#!/usr/bin/env bash
# Copies the newest complete local backup and .env.production into an
# encrypted restic repository off this server, then applies the off-site
# retention (7 daily, 4 weekly, 6 monthly). On Sundays it also re-reads a
# sample of the stored data to catch silent corruption. On success it updates
# $BACKUP_ROOT/offsite-last-success, which deploy/monitor.sh checks.
#
# Configured by $OFFSITE_ENV (default /etc/labtracker/offsite.env, mode 600),
# which sets RESTIC_REPOSITORY, RESTIC_PASSWORD_FILE and any credentials the
# repository's backend needs. Without that file it does nothing and exits 0,
# so the backup timer works before off-site storage is set up.
# See docs/deploy-homelab.md, section 9.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
OFFSITE_ENV=${OFFSITE_ENV:-/etc/labtracker/offsite.env}

if [[ ! -f $OFFSITE_ENV ]]; then
  echo "Off-site backup not configured ($OFFSITE_ENV missing); skipping."
  exit 0
fi
command -v restic > /dev/null || { echo "restic is not installed (sudo apt install restic)." >&2; exit 1; }

set -a
# shellcheck source=/dev/null
. "$OFFSITE_ENV"
set +a
: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY in $OFFSITE_ENV}"
[[ -n ${RESTIC_PASSWORD_FILE:-}${RESTIC_PASSWORD:-} ]] || { echo "Set RESTIC_PASSWORD_FILE in $OFFSITE_ENV." >&2; exit 1; }

latest=$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '2*Z' | sort | tail -n 1)
[[ -n $latest ]] || { echo "No complete local backup in $BACKUP_ROOT to copy." >&2; exit 1; }

echo "==> Off-site: $(basename "$latest") + .env.production -> $RESTIC_REPOSITORY"
# Paths are stored as given, so a restore recreates srv/labtracker/... and
# .env.production under the chosen target directory.
restic backup --tag labtracker --host labtracker "$latest" "$PWD/.env.production"

echo "==> Off-site retention"
# Group by host and tag, not restic's default host+paths: every night's
# backup is a differently named folder, so path groups would never expire.
restic forget --tag labtracker --host labtracker --group-by host,tags \
  --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

if [[ $(date +%u) == 7 ]]; then
  echo "==> Off-site integrity check (weekly)"
  restic check --read-data-subset=10%
fi

basename "$latest" > "$BACKUP_ROOT/offsite-last-success"
echo "==> Off-site backup complete"
