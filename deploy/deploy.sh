#!/usr/bin/env bash
# Builds and starts (or updates) the stack at the currently checked-out commit.
# On an existing install it takes a backup first, because the API applies any
# new EF Core migrations when it starts. Used for first deploys, updates and
# rollbacks (check out the older commit, then run this).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env.production ]] || { echo "Missing .env.production; run deploy/generate-env.sh first." >&2; exit 1; }
compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)

# Overrides APP_VERSION in .env.production, so images are tagged per commit
# and older ones stay available for a rollback.
APP_VERSION=$(git rev-parse --short HEAD)
export APP_VERSION
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "Warning: uncommitted changes; image tag $APP_VERSION won't match them exactly." >&2
fi

if [[ -n $("${compose[@]}" ps -q db 2>/dev/null) ]]; then
  echo "==> Backing up before the update"
  deploy/backup.sh
fi

echo "==> Building $APP_VERSION"
"${compose[@]}" build --pull

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
