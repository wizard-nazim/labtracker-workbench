#!/usr/bin/env bash
# Builds and starts (or updates) the stack at the currently checked-out commit.
# On an existing install it takes a backup first, because the API applies any
# new EF Core migrations when it starts. Used for first deploys, updates and
# rollbacks (check out the older commit, then run this).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.production ]] || { echo "Missing .env.production; run deploy/generate-env.sh first." >&2; exit 1; }
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)

# One deploy at a time; deploy/monitor.sh also skips container checks while
# this is held, since a deploy restarts containers on purpose.
BACKUP_ROOT=${BACKUP_ROOT:-/srv/labtracker/backups}
mkdir -p "$BACKUP_ROOT"
exec 8> "$BACKUP_ROOT/.deploy.lock"
flock -n 8 || { echo "Another deploy is already running." >&2; exit 1; }

# Overrides APP_VERSION in .env.production, so images are tagged per commit
# and older ones stay available for a rollback.
APP_VERSION=$(git rev-parse --short HEAD)
export APP_VERSION
# BuildKit's default provenance attestations make every rebuild a new image
# ID, so the tag drifts off running containers even when nothing changed.
export BUILDX_NO_DEFAULT_ATTESTATIONS=1
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "Warning: uncommitted changes; image tag $APP_VERSION won't match them exactly." >&2
fi

if [[ -n $("${compose[@]}" ps -q db 2>/dev/null) ]]; then
  echo "==> Backing up before the update"
  deploy/backup.sh
fi

echo "==> Building $APP_VERSION"
"${compose[@]}" build --pull

# Record the version in .env.production, so plain `docker compose ... up`
# (e.g. after editing a setting) reuses these images instead of building a
# new `latest` from whatever is checked out.
if grep -q '^APP_VERSION=' .env.production; then
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$APP_VERSION/" .env.production
else
  echo "APP_VERSION=$APP_VERSION" >> .env.production
fi
chmod 600 .env.production

echo "==> Starting"
# Garage reads deploy/garage.toml from a bind mount, and Compose doesn't
# notice changes to mounted files, so always recreate it (a few seconds).
"${compose[@]}" up -d --wait --wait-timeout 240 --force-recreate storage
"${compose[@]}" up -d --wait --wait-timeout 240

# Lets nginx read photos anonymously through Garage's web endpoint. Idempotent.
"${compose[@]}" exec -T -e RUST_LOG=warn storage /garage bucket website --allow labtracker-equipment >/dev/null

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $APP_VERSION" >> .deploy-history
"${compose[@]}" ps
echo "==> Deployed $APP_VERSION. Check it with: curl -fsS http://\$WEB_BIND:\$WEB_PORT/health"
