#!/usr/bin/env bash
# $POSTGRES_* in single quotes expand inside the db container, on purpose.
# shellcheck disable=SC2016
#
# Restores a backup made by deploy/backup.sh, replacing ALL current data in
# Postgres and Garage. Use the same .env.production the backup was taken with:
# Garage's access key is inside the backup and must match S3_ACCESS_KEY.
#
#   deploy/restore.sh /srv/labtracker/backups/20261101T020000Z
set -euo pipefail
cd "$(dirname "$0")/.."

dir=${1:?usage: deploy/restore.sh <backup directory>}
dir=$(cd "$dir" && pwd)
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)
project=labtracker
tool_image=postgres:16-alpine

echo "==> Checking $dir"
(cd "$dir" && sha256sum --check --quiet SHA256SUMS)

if [[ ${2:-} != --yes ]]; then
  echo "This replaces every record and photo with the contents of $dir."
  read -r -p "Type 'restore' to continue: " answer
  [[ $answer == restore ]] || { echo "Cancelled."; exit 1; }
fi

trap 'echo "Restore failed partway; the app is stopped. Fix the error and run this again with the same backup." >&2' ERR

echo "==> Stopping the web and API containers"
"${compose[@]}" stop web api

echo "==> Restoring the database"
"${compose[@]}" up -d --wait db
"${compose[@]}" exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
"${compose[@]}" exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < "$dir/db.dump"

echo "==> Restoring object storage"
"${compose[@]}" stop storage
docker run --rm \
  -v "${project}_garage_meta:/meta" \
  -v "${project}_garage_data:/data" \
  -v "$dir:/backup:ro" \
  "$tool_image" sh -c 'tar tzf /backup/storage.tar.gz > /dev/null && find /meta /data -mindepth 1 -delete && tar xzf /backup/storage.tar.gz -C /'

echo "==> Starting everything"
"${compose[@]}" up -d --wait --wait-timeout 240
"${compose[@]}" exec -T -e RUST_LOG=warn storage /garage bucket website --allow labtracker-equipment > /dev/null
"${compose[@]}" ps
echo "==> Restored from $dir (taken at app version $(cat "$dir/app-version" 2>/dev/null || echo unknown))."
