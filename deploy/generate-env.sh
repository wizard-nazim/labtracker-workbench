#!/usr/bin/env bash
# Writes .env.production from .env.production.example with fresh random
# secrets. Refuses to overwrite an existing file: replacing the database or
# storage secrets on a running install locks the app out of its own data.
set -euo pipefail
cd "$(dirname "$0")/.."

out=.env.production
if [[ -e $out ]]; then
  echo "$out already exists; not overwriting it." >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl is required." >&2; exit 1; }

umask 077
sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" \
  -e "s|^JWT_SIGNING_KEY=.*|JWT_SIGNING_KEY=$(openssl rand -base64 48 | tr -d '\n')|" \
  -e "s|^GARAGE_RPC_SECRET=.*|GARAGE_RPC_SECRET=$(openssl rand -hex 32)|" \
  -e "s|^S3_ACCESS_KEY=.*|S3_ACCESS_KEY=GK$(openssl rand -hex 12)|" \
  -e "s|^S3_SECRET_KEY=.*|S3_SECRET_KEY=$(openssl rand -hex 32)|" \
  .env.production.example > "$out"
chmod 600 "$out"

echo "Wrote $out (mode 600). Now edit ALLOWED_HOSTS, WEB_BIND and the BOOTSTRAP_ADMIN_* lines."
