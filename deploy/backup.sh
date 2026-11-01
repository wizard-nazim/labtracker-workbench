#!/usr/bin/env bash
# $POSTGRES_* in single quotes expand inside the db container, on purpose.
# shellcheck disable=SC2016
#
# Backs up Postgres (pg_dump, custom format) and Garage (its metadata and data
# volumes) into $BACKUP_ROOT/<UTC timestamp>/, then deletes backups older than
# $KEEP_DAYS. Garage is stopped for the few seconds the copy takes, so photo
# uploads fail briefly; everything else keeps working. Safe to run from cron.
#
# These backups sit on the same disk as the data. Copy them somewhere else too
# (see docs/deploy-homelab.md), along with .env.production.
set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
KEEP_DAYS=${KEEP_DAYS:-14}
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
project=labtracker
# Already on the host (it's the db image), and it has tar and gzip.
tool_image=postgres:16-alpine

dir="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)"
umask 077
mkdir -p "$dir"

echo "==> Database -> $dir/db.dump"
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$dir/db.dump"
# A dump that pg_restore can't list is broken; fail loudly instead of keeping it.
"${compose[@]}" exec -T db pg_restore --list < "$dir/db.dump" > /dev/null

echo "==> Object storage -> $dir/storage.tar.gz"
restart_storage() { "${compose[@]}" start storage > /dev/null; }
trap restart_storage EXIT
"${compose[@]}" stop storage > /dev/null
docker run --rm \
  -v "${project}_garage_meta:/meta:ro" \
  -v "${project}_garage_data:/data:ro" \
  -v "$dir:/backup" \
  "$tool_image" tar czf /backup/storage.tar.gz -C / meta data
restart_storage
trap - EXIT

git rev-parse --short HEAD > "$dir/app-version" 2>/dev/null || true
(cd "$dir" && sha256sum db.dump storage.tar.gz > SHA256SUMS)

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "==> Backup complete: $dir ($(du -sh "$dir" | cut -f1))"
