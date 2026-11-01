# Self-hosted deployment (homelab beta)

This runbook covers running LabTracker on one Ubuntu server with Docker
Compose: first deploy, verification, updates, rollback, backups and
restores, monitoring, and public access through a Cloudflare Tunnel. It was
written for the beta host (HP ProDesk 600 G3 DM, Ubuntu 26.04, 8 GB RAM, LAN
IP `10.0.0.20`, app in `/srv/labtracker/app`), but nothing in it is specific to
that machine beyond the examples.

## What runs

```
 tester ──HTTPS──▶ Cloudflare (Access, TLS) ══tunnel══▶ tunnel (cloudflared, optional)
                                                          │ http://web:80
 LAN browser ──▶ WEB_BIND:WEB_PORT ──────────────────────▶ web (nginx :80)
                    ├─ /                built React app
                    ├─ /api/, /health ─▶ api (ASP.NET Core :8080)
                    └─ /storage/…     ─▶ storage web endpoint (read-only photos)
                 api ─▶ db (PostgreSQL 16)  and  storage S3 API (Garage :3900)
```

| Service | Image | Data | Memory limit |
|---|---|---|---|
| `web` | built from `frontend/` | none | 128 MB |
| `api` | built from `backend/` | none | 1 GB |
| `db` | `postgres:16-alpine` | volume `labtracker_pgdata` | 1 GB |
| `storage` | `dxflrs/garage:v2.5.0` | volumes `labtracker_garage_meta`, `labtracker_garage_data` | 512 MB |
| `tunnel` (optional) | `cloudflare/cloudflared:2026.9.3` | none | 128 MB |

That's about 2.8 GB at most, which leaves room on an 8 GB host for the OS,
image builds (about 2 GB while the .NET SDK runs) and the page cache.

- **Networks.** `db` and `storage` are only on the `internal` network, which
  has no internet access and isn't reachable from the LAN. `api` and `web` are
  also on `edge` so the API can reach Google for sign-in checks. `tunnel` and
  `web` share the `tunnel` network (section 10). Only `web` publishes a port.
- **Object storage.** [Garage](https://garagehq.deuxfleurs.fr/) is an actively
  maintained, S3-compatible store built for small self-hosted setups. MinIO
  was ruled out: its community edition is archived and no longer publishes
  images. The API talks S3 to Garage; browsers load photos through nginx at
  `/storage/…`, which allows only `GET` and `HEAD` and only under the photos
  prefix. Garage's ports are never published.
- **Production mode.** The API image runs with `ASPNETCORE_ENVIRONMENT=Production`.
  In that mode there are no demo users, no sample data and no Swagger. The
  demo-data reset is off, and the MCB import stays off unless
  `FEATURE_MCB_IMPORT=true`.

Files involved: `docker-compose.prod.yml`, `deploy/garage.toml`,
`frontend/nginx.conf`, `.env.production.example`, and the scripts in `deploy/`.

## 1. Check the server

Run each of these before deploying and fix anything that fails. None of it is
assumed to work yet.

```bash
# Docker Engine and the Compose v2 plugin (2.20 or newer, for `up --wait-timeout`)
docker version
docker compose version
docker run --rm hello-world

# Your user can use Docker without sudo (log out and in after adding the group)
id -nG | grep -qw docker && echo "in docker group" || echo "run: sudo usermod -aG docker $USER"

# Tools the scripts use
git --version && openssl version && sha256sum --version | head -1

# Resources: at least ~10 GB free for images and data, ~6 GB RAM available
df -h / /var/lib/docker
free -h

# Clock synced (sign-in tokens expire by the clock)
timedatectl | grep -E "synchronized|NTP service"

# Outbound DNS/HTTPS for image pulls and Google sign-in
getent hosts registry-1.docker.io
curl -sSI https://www.googleapis.com/oauth2/v1/certs | head -1

# Nothing else is using the web port (default 8080)
sudo ss -tlnp | grep -E ':8080\b' || echo "8080 free"
```

Docker-published ports **bypass ufw**. The stack only publishes nginx, bound to
the single address in `WEB_BIND`, so don't change that to `0.0.0.0`. Check
`sudo ufw status verbose` anyway, and make sure the router doesn't forward any
port to this server: public access will come through the tunnel, which needs
no inbound ports.

## 2. Get the code

```bash
sudo mkdir -p /srv/labtracker/app /srv/labtracker/backups
sudo chown -R "$USER": /srv/labtracker
chmod 700 /srv/labtracker/backups
git clone https://github.com/wizard-nazim/labtracker-workbench.git /srv/labtracker/app
cd /srv/labtracker/app
git checkout main
```

## 3. Configure

```bash
cd /srv/labtracker/app
deploy/generate-env.sh          # writes .env.production (mode 600) with random secrets
nano .env.production
```

Edit the lines marked `EDIT`:

- `ALLOWED_HOSTS`: the hostnames browsers will use, quoted and
  semicolon-separated, e.g. `"localhost;127.0.0.1;10.0.0.20"`. The API answers
  `400` to any other `Host`.
- `WEB_BIND`: leave it at `127.0.0.1` to keep the app on the server only.
  Set it to `10.0.0.20` to test from other machines on the LAN.
- `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`: the first Super
  Admin. The password must be at least 12 characters; you'll change it after
  the first sign-in.

Then **copy `.env.production` somewhere safe off the server**, such as a password
manager. Backups are useless without it: it holds the database password and
Garage's keys. Losing `JWT_SIGNING_KEY` only signs everyone out.

Never commit `.env.production` (it's gitignored), and never re-run
`generate-env.sh` against a live install. It refuses to overwrite the file,
because new database or storage secrets would lock the app out of its data.

## 4. First deploy

```bash
cd /srv/labtracker/app
deploy/deploy.sh
```

This builds both images (tagged with the git commit), starts Postgres and
Garage, then starts the API, which applies every EF Core migration to the
empty database and creates the bootstrap admin. Then it starts nginx, waits
until every container reports healthy, and allows anonymous reads of the
photo bucket. The first build takes several minutes on the i3.

Then remove the bootstrap credentials:

1. Sign in as the bootstrap admin and set a new password: Admin → People →
   Users → ⋯ on your row → Edit login. There is no self-service password
   change; admins set passwords this way.
2. Empty both `BOOTSTRAP_ADMIN_*` values in `.env.production`, leaving
   `BOOTSTRAP_ADMIN_EMAIL=` and `BOOTSTRAP_ADMIN_PASSWORD=`.
3. Apply the change as in [Changing a setting](#changing-a-setting).

(The bootstrap only ever creates an admin when the database has no users, but
the password shouldn't stay in the file. If only one of the two is set, the
API logs a warning and ignores both.)

### Changing a setting

After editing `.env.production`, recreate the affected containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --wait
```

This reuses the images of the last deploy: `deploy.sh` records their version
as `APP_VERSION` in the file. Only `GOOGLE_CLIENT_ID` is built into an image;
change it with `deploy/deploy.sh` instead. If the API doesn't come back
healthy, its log says which setting is wrong:
`docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=20 api`.

Edit the file carefully: one stray character can break it. Compose reports the
line number (`failed to read .env.production: line 5 ...`). Values containing
`$`, `#` or spaces go in single quotes.

### Loading the MCB equipment list

A one-off import adds the department's 67 items with their types, rooms,
facilities and 6 science officers. It refuses to run twice.

1. Set `FEATURE_MCB_IMPORT=true` and apply it (see above).
2. In the browser, hard-refresh (Ctrl+Shift+R): the app checks the feature
   once per page load. Then Admin → Settings → Data tools → Import MCB equipment.
3. Set `FEATURE_MCB_IMPORT=false`, apply it, and run `deploy/backup.sh`.

The imported science officers are inactive with `@mcb.placeholder.invalid`
emails. Give each real tester a login with Admin → People → Users → ⋯ →
Edit login, then activate them.

## 5. Verify

Use these after the first deploy and after every update. Set `B` to the
address you configured.

```bash
cd /srv/labtracker/app
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
B=http://127.0.0.1:8080          # or http://10.0.0.20:8080

$C ps                                             # all four "healthy"
curl -fsS $B/health                               # {"status":"healthy"}
curl -fsS -o /dev/null -w '%{http_code}\n' $B/    # 200 (the app)

# Production mode: no Swagger, no demo users, no demo reset
$C exec api printenv ASPNETCORE_ENVIRONMENT       # Production
$C exec api curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/swagger/index.html   # 404
curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' \
  -d '{"email":"admin@labtracker.local","password":"ChangeMe123!"}' $B/api/auth/login         # 401

# Only nginx is published, and only on WEB_BIND
sudo ss -tlnp | grep -E ':(5432|3900|3901|3902|3903|8080)\b'   # only the 8080 line
$C exec db sh -c 'wget -q -T 5 -O /dev/null https://example.com && echo REACHABLE || echo blocked'   # blocked

# Storage: Garage healthy, website access on
$C exec -e RUST_LOG=warn storage /garage status
$C exec -e RUST_LOG=warn storage /garage bucket info labtracker-equipment | grep "Website access"   # true
```

Then in a browser: sign in, add a piece of equipment with a photo, and check
that the photo shows on the equipment page.

From another LAN machine (only if `WEB_BIND=10.0.0.20`), check that only the
app answers:

```bash
curl -fsS http://10.0.0.20:8080/health
nc -zv -w 3 10.0.0.20 5432    # must fail
nc -zv -w 3 10.0.0.20 3900    # must fail
```

## 6. Database: initialisation and migrations

- Schema changes ship only as EF Core migrations in
  `backend/src/LabTracker.Infrastructure/Migrations`. With
  `MIGRATE_ON_STARTUP=true` (the default), the API applies pending migrations
  before it starts listening. That's safe here because exactly one API
  container runs. On an empty database this builds the whole schema; no seed
  data is added in Production.
- `deploy/deploy.sh` takes a full backup before every update, so a migration
  that goes wrong can be undone with a restore (section 9).
- To see what an update will change before deploying it:

  ```bash
  git fetch
  git diff --stat HEAD..origin/main -- backend/src/LabTracker.Infrastructure/Migrations
  ```

  To review the SQL, generate it on a dev machine with the .NET SDK:
  `dotnet ef migrations script --idempotent -p src/LabTracker.Infrastructure -s src/LabTracker.Api`
  (run from `backend/`).
- To apply migrations by hand instead, set `MIGRATE_ON_STARTUP=false`. Then
  apply the idempotent script with
  `$C exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < script.sql`
  before starting the new API.

## 7. Updating

```bash
cd /srv/labtracker/app
git fetch && git log --oneline HEAD..origin/main     # what's coming
git pull --ff-only
deploy/deploy.sh                                     # backup → build → start → wait healthy
```

Then run the checks in section 5. Every deploy is logged to `.deploy-history`
with its time and commit. Old images stay on disk for rollbacks; prune them
now and then: `docker image prune` (dangling only) or
`docker image ls labtracker-*` and remove specific old tags.

Photo uploads fail for a few seconds while storage restarts during a deploy
or backup; everything else stays up until the API restarts.

## 8. Rolling back

Find the previous good commit with `cat .deploy-history`.

**No migrations between the two versions** (the `git diff --stat` in section 6
was empty). Just redeploy the old code:

```bash
git checkout <previous-commit>
deploy/deploy.sh
```

**The bad version applied migrations.** Older code may not work with the newer
schema, so restore the backup that `deploy.sh` took just before the bad
update. Anything users changed after that backup is lost.

```bash
ls /srv/labtracker/backups                            # the one just before the bad deploy
git checkout <previous-commit>
deploy/deploy.sh                                      # rebuilds the old version
deploy/restore.sh /srv/labtracker/backups/<timestamp> # puts the old data back
```

You're now on a detached HEAD. Go back to normal updates later with
`git checkout main && git pull --ff-only && deploy/deploy.sh`.

## 9. Backups and restores

### What a backup is

`deploy/backup.sh` writes `/srv/labtracker/backups/<UTC timestamp>/` containing:

- `db.dump`: `pg_dump` in custom format, checked with `pg_restore --list`
- `storage.tar.gz`: Garage's metadata and data volumes (see
  [Why storage pauses](#why-storage-pauses-during-a-backup))
- `SHA256SUMS` and `app-version` (the git commit running at the time)

A run writes into `<timestamp>.partial` and renames it only when every step
succeeded, so **a folder without `.partial` is always a complete backup**.
`last-success` in the same folder names the newest one. A failed run leaves
its `.partial` folder for a day so you can look at it, then it's deleted.

### Nightly backups and health checks (systemd timers)

The repo ships systemd units in `deploy/systemd/`. One more install step puts
them in place for your user and this checkout. It shows what it will change
and asks before doing it:

```bash
cd /srv/labtracker/app && deploy/install-systemd.sh
```

It enables two timers:

| Timer | When | Runs |
|---|---|---|
| `labtracker-backup.timer` | daily ~02:30 (random 0–15 min); runs at boot if the server was off | `backup.sh`, then `offsite-backup.sh` |
| `labtracker-monitor.timer` | every 10 minutes | `monitor.sh` (section 12) |

If either fails, systemd starts `labtracker-alert@…`, which records it and,
once configured, notifies you (section 12). Output goes to the journal; no log
files to rotate:

```bash
systemctl list-timers 'labtracker-*'             # next and last runs
journalctl -u labtracker-backup -n 50            # last backup's output
sudo systemctl start labtracker-backup           # run a backup now (waits until done)
systemctl status labtracker-backup --no-pager    # did the last run succeed?
```

If you added a cron line for backups earlier, remove it
(`sudo rm /etc/cron.d/labtracker-backup`) so backups don't run twice.

### Retention and disk space

- **Local:** complete backups older than `KEEP_DAYS` (14) are deleted, but the
  newest `KEEP_MIN` (7) are always kept, so a stretch of failed backups never
  empties the folder.
- **Disk guard:** a backup refuses to start unless `MIN_FREE_MB` (5120) plus
  twice the size of the last backup is free. It fails before touching
  anything, and the alert tells you.
- To change these, run `sudo systemctl edit labtracker-backup.service` and add,
  for example:

  ```ini
  [Service]
  Environment=KEEP_DAYS=30 KEEP_MIN=10
  ```

- **Off-site** (below): 7 daily, 4 weekly and 6 monthly copies.
- **Other disk users.** Docker logs are capped at 50 MB per container. Images
  pile up, one set per deploy, and the monitor warns at 85% full. To keep the
  last three deployed versions (for rollbacks) and drop the rest:

  ```bash
  cd /srv/labtracker/app
  keep=$(tail -n 3 .deploy-history | awk '{print $2}' | sort -u | paste -sd'|')
  docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^labtracker-(api|web):' \
    | grep -vE ":($keep)$" | xargs -r docker image rm
  docker builder prune -f --filter until=168h      # build cache older than a week
  ```

### Why storage pauses during a backup

Garage keeps object metadata in a SQLite database and photo bytes in
content-addressed block files. A file copy of a SQLite database that's being
written to can be corrupt, so `backup.sh` stops Garage, copies both volumes,
and starts it again. `backup.sh` logs how long that took ("storage was paused
for Ns"). On this server it's about 1–2 seconds. During the pause, photo
uploads and photo loads fail; everything else works.

The alternatives were considered and not used:

- **`garage meta snapshot`** copies the metadata database consistently while
  Garage runs. But the block files would still be copied live, so a photo
  deleted between the snapshot and the copy could restore as a broken image.
  Restoring would also mean swapping database files by hand, a path that's
  harder to rehearse.
- **Copying objects through the S3 API** (rclone or the AWS CLI) needs no
  pause. But it adds a tool and a separate restore path (re-uploading every
  object), for a saving of about two seconds a night.

At 02:30 with about 10 users, a pause of a couple of seconds is the simpler
and better-tested option. Revisit it if the logged pause grows past about 30
seconds, which would mean tens of GB of photos.

### Off-site, encrypted (restic)

`deploy/offsite-backup.sh` runs right after each local backup. It copies the
newest backup **and `.env.production`** into a [restic](https://restic.net)
repository. restic encrypts everything on this server before it leaves, and
deduplicates, so each night only sends what changed. Until it's configured it
does nothing. Setup, once:

1. **Pick a destination that isn't this server:** another machine or NAS over
   SFTP (`sftp:user@nas:/backups/labtracker`), an S3-compatible bucket such as
   Backblaze B2 (`s3:https://s3.<region>.backblazeb2.com/<bucket>`), or a USB
   disk you take away (a local path). For SFTP, set up key-based SSH from this
   server's user to the destination first (`ssh-copy-id user@nas`), and
   check that `ssh user@nas` works without a password prompt.
2. **Install restic and create a long random repository password.**
   `/etc/labtracker` is created by `deploy/install-systemd.sh`, so run that
   first.

   ```bash
   sudo apt install restic
   openssl rand -base64 32 > /etc/labtracker/restic-password && chmod 600 /etc/labtracker/restic-password
   ```

3. **Write `/etc/labtracker/offsite.env`** (mode 600):

   ```bash
   cat > /etc/labtracker/offsite.env <<'EOF'
   RESTIC_REPOSITORY=sftp:user@nas:/backups/labtracker
   RESTIC_PASSWORD_FILE=/etc/labtracker/restic-password
   # For S3/B2 also set: AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
   EOF
   chmod 600 /etc/labtracker/offsite.env
   ```

4. **Initialise the repository and run once:**

   ```bash
   set -a; . /etc/labtracker/offsite.env; set +a; restic init
   cd /srv/labtracker/app && deploy/offsite-backup.sh
   restic snapshots
   ```

5. **Make your recovery kit.** Store these in your password manager, **not
   only on this server**:
   - the restic repository location (the `RESTIC_REPOSITORY` line)
   - the restic password (`cat /etc/labtracker/restic-password`)
   - any S3/B2 keys
   - a copy of `.env.production`

   Without the restic password the off-site copy is unreadable, by design.
   `.env.production` is inside every off-site snapshot too, so the kit is
   enough to rebuild from nothing.

On Sundays the script also re-reads 10% of the stored data
(`restic check --read-data-subset=10%`) to catch corruption at the
destination.

### Rehearsing a restore (safe)

`deploy/restore-rehearsal.sh` restores a backup into a **separate, temporary
copy** of the stack (Compose project `labtracker-rehearsal`, with its own
containers, volumes and networks, on `127.0.0.1:18088`), checks it, and
removes it. It never stops or changes the live app.

```bash
cd /srv/labtracker/app
deploy/restore-rehearsal.sh                          # newest backup
deploy/restore-rehearsal.sh /srv/labtracker/backups/<timestamp>
```

It ends with `REHEARSAL PASSED` or `REHEARSAL FAILED`. It checks that:

- all four rehearsal containers are healthy and `/health` answers through nginx
- every table's row count matches, shown next to the live database (live
  counts can be higher if people added data since the backup)
- every photo recorded in the database loads from the restored storage
- the live containers weren't restarted

While it runs it needs about 1.5 GB of free memory, and it refuses to start
with less. To look around the restored copy yourself, add `--keep`, then open
an SSH tunnel **from your laptop**
(`ssh -L 18088:127.0.0.1:18088 wizard-nazim@10.0.0.20`) and browse
http://localhost:18088. Remove it afterwards with
`deploy/restore-rehearsal.sh --down`.

To rehearse the **off-site** copy too, restore it to a scratch folder and
rehearse from there:

```bash
set -a; . /etc/labtracker/offsite.env; set +a
restic restore latest --target /tmp/offsite-test
deploy/restore-rehearsal.sh "$(find /tmp/offsite-test -type d -name '2*Z' | head -n 1)"
rm -r /tmp/offsite-test
```

Rehearse once now, then monthly.

### Restoring for real

This **replaces all current data** in the live app:

```bash
cd /srv/labtracker/app
deploy/restore.sh /srv/labtracker/backups/<timestamp>
```

The script:

- refuses to start if a file doesn't match its checksum
- asks you to type `restore`
- stops the app, then replaces the database and storage volumes
- starts everything again and waits until it's healthy

Use the same `.env.production` the backup was taken with: Garage's keys are
inside the backup.

**Onto a new server** (the old one is gone):

1. Install Docker and restic, and clone the repo to `/srv/labtracker/app`.
2. Recreate `/etc/labtracker/offsite.env` and the password file from your
   recovery kit.
3. Run `restic restore latest --target /tmp/recovered`.
4. Copy the recovered `.env.production` into `/srv/labtracker/app`
   (mode 600).
5. Run `deploy/deploy.sh`, then `deploy/restore.sh <recovered backup folder>`.

## 10. Public access through Cloudflare Tunnel

The stack includes an optional `cloudflared` container, Compose profile
`tunnel`, which connects out to Cloudflare. Visitors reach the app over HTTPS
at a Cloudflare hostname, and this server never opens an inbound port. It's
off until you turn it on.

How it fits together:

- `cloudflared` sits on its own Docker network, `tunnel`, at the fixed
  address `10.213.47.10`, next to nginx. The tunnel's public hostname points
  at `http://web:80`.
- **Real visitor IPs.** Through the tunnel, every request reaches nginx from
  `cloudflared`. nginx therefore takes the visitor's address from Cloudflare's
  `CF-Connecting-IP` header, **but only for requests from `10.213.47.10`**.
  That way the API's sign-in limit (`LOGIN_RATE_LIMIT` per minute) applies to
  each tester separately. A `CF-Connecting-IP` sent by anyone else, such as a
  LAN machine using the published port or another container, is ignored.
  Never widen the trusted address to the whole subnet: the network's gateway
  also forwards LAN traffic to the published port.
- **HTTPS.** TLS ends at Cloudflare. The API's own HTTP→HTTPS redirect is off
  (`Https:RedirectToHttps=false`). The API still knows tunnel visitors used
  HTTPS, from `X-Forwarded-Proto`, so it sends HSTS headers to them.
- **Monitoring.** While the profile is on, `deploy/monitor.sh` also checks
  that `cloudflared` is healthy, using `cloudflared tunnel ready`.

### Before you start (verify; don't assume)

1. The domain is on Cloudflare. `dig NS <domain> +short` should show
   `*.ns.cloudflare.com`.
2. Pick the hostname, e.g. `labtracker.<domain>`. Make sure no DNS record for
   it exists yet: the tunnel creates its own.
3. Make sure the tunnel subnet doesn't clash with anything on the server.
   `ip -4 route | grep 10.213.47` should print nothing before the first
   tunnel deploy.
4. The first nightly backup has run: `journalctl -u labtracker-backup -n 5`.

### In the Cloudflare dashboard

1. **Zero Trust → Networks → Tunnels → Create a tunnel**, type *Cloudflared*.
   Name it `labtracker`. Choose the Docker install option and copy only the
   **token**: the long string after `--token`. Don't run the command it
   shows.
2. **Public hostname:** subdomain `labtracker`, your domain, service type
   `HTTP`, URL `web:80`. Add no other hostnames. Cloudflare's default
   catch-all answers 404, so nothing else on this server, such as Wekan, is
   reachable.
3. **Zero Trust → Access → Applications → Add → Self-hosted** for
   `labtracker.<domain>`:
   - policy *Allow* with an **Emails** list of your testers
   - login method **One-time PIN**
   - session duration about 1 week

   Only invited people then reach the sign-in page at all. When an Access
   session expires mid-use, the app's requests fail until the tester reloads
   the page. A longer session makes that rarer.
4. **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS**.
5. **Speed → Optimization:** make sure **Rocket Loader** is off. It rewrites
   the app's scripts. Under **Scrape Shield**, turn off **Email
   Obfuscation**.
6. Optional: a **WAF rate-limiting rule** for `/api/auth/` as an outer layer.

### On the server

```bash
cd /srv/labtracker/app && nano .env.production
```

- `COMPOSE_PROFILES=tunnel`
- `TUNNEL_TOKEN=<the token>`. It's a secret: it's in the mode-600 file, it
  goes into off-site backups with that file, and you should keep a copy in
  your password manager.
- Add the hostname to `ALLOWED_HOSTS`, e.g.
  `ALLOWED_HOSTS="localhost;127.0.0.1;10.0.0.20;labtracker.<domain>"`.
- `LOGIN_RATE_LIMIT` can stay at 10, now that it counts per tester.

```bash
deploy/deploy.sh
docker compose -f docker-compose.prod.yml --env-file .env.production ps tunnel   # healthy
```

In the dashboard, the tunnel should show as **Healthy**. LAN access through
`WEB_BIND:WEB_PORT` keeps working. Once you no longer need it, set
`WEB_BIND=127.0.0.1` with a port nothing else uses on `127.0.0.1` (check with
`sudo ss -tlnp | grep ':<port>\b'`; Wekan's FerretDB already has `8088`), so
only the server itself and the tunnel can reach nginx.

### Verify from outside (phone on mobile data, not your Wi-Fi)

1. `https://labtracker.<domain>` shows the Cloudflare Access page first. After
   the emailed PIN, it shows LabTracker's sign-in.
2. `http://labtracker.<domain>` redirects to `https://`.
3. Sign in, open the equipment list, and open a photo.
4. On the server, nginx logs your phone's public IP, not `10.213.47.10`:
   `docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail 5 web`.
5. Rate limit per tester: from the phone, 11 wrong passwords within a minute
   gets "Too many sign-in attempts", while signing in from another network at
   the same moment still works.

### Turning it off

Set `COMPOSE_PROFILES=` (empty) and run `deploy/deploy.sh`, then remove the
leftover container:
`docker compose -f docker-compose.prod.yml --env-file .env.production rm -sf tunnel`.
Or pause public access without touching the server: delete the public
hostname in the dashboard.

### Before inviting testers

- **Accounts.** Create each tester in Admin → People. Testers can't change
  their own password yet, and there's no password reset by email; you set
  passwords. Google sign-in avoids passwords for testers with Gmail or
  Workspace accounts: add `https://labtracker.<domain>` to the OAuth client's
  authorised JavaScript origins, set `GOOGLE_CLIENT_ID`, and run
  `deploy/deploy.sh`.
- **Deactivating someone** blocks new sign-ins at once, but a session that's
  already open keeps working for up to 8 hours, until the sign-in token
  expires.
- **Photos.** Anyone who has a photo's exact link can open it without signing
  in. The links contain random IDs and can't be guessed.

## 11. Day-to-day commands

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C ps                                   # status and health
$C logs -f --tail=100 api               # API logs (also: web, db, storage)
$C restart api                          # restart one service
$C exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'   # SQL shell
$C exec -e RUST_LOG=warn storage /garage bucket info labtracker-equipment   # photo count and size
systemctl list-timers 'labtracker-*'    # next backup and health-check runs
journalctl -u labtracker-backup -n 30   # last backup (also: labtracker-monitor)
docker system df                        # disk used by images, volumes, build cache
docker builder prune                    # reclaim build cache
$C down                                 # stop everything (volumes and data are kept)
```

Never run `$C down -v` or `docker volume rm labtracker_*` on the live server:
that deletes the database and every photo.

## 12. Monitoring and alerts

No extra services: `labtracker-monitor.timer` runs `deploy/monitor.sh` every
10 minutes and writes one line to the journal:

```
containers: healthy | disk: / 23% /srv/labtracker/backups 23% | mem available: 5123 MB | backup: 7h ago | off-site: 7h ago | usage: web 11MiB,api 120MiB,db 45MiB,storage 9MiB
```

The run fails, and alerts, when:

- a container isn't running and healthy
- `/health` fails through nginx
- a filesystem (`/`, Docker's data, the backups) is over `DISK_MAX_PCT` (85%)
- available memory is under `MEM_MIN_MB` (400 MB)
- the last successful local backup, or the off-site one once configured, is
  over 26 hours old

It skips the container checks while a backup or deploy is running, because
both pause containers on purpose.

```bash
journalctl -u labtracker-monitor -n 20 --no-pager   # recent checks
cd /srv/labtracker/app && deploy/monitor.sh          # run a check now
```

**Getting notified.** Until you configure it, failures only go to the
journal. Create `/etc/labtracker/alert.env` (mode 600) with either or both:

```bash
cat > /etc/labtracker/alert.env <<'ENV'
# Where to POST a short message when a backup or health check fails.
# e.g. a private ntfy topic (phone app: ntfy) or a Healthchecks.io ".../fail" URL.
ALERT_URL=https://ntfy.sh/<long-random-topic-name>
# Pinged after every healthy check. A dead-man's switch such as Healthchecks.io
# then alerts when pings stop, which covers the whole server being down.
PING_URL=https://hc-ping.com/<uuid>
ENV
chmod 600 /etc/labtracker/alert.env
```

- An alert includes the failing unit's last 12 log lines. Those contain no
  secrets, but treat the topic as private: use a long random ntfy topic name,
  or a service with an account.
- The same unit alerts at most once every 6 hours while it keeps failing, and
  alerts again right away after it has recovered and fails anew.
- For alerts to include log lines, your user must be able to read the system
  journal: `sudo usermod -aG adm wizard-nazim`, then log in again.

To test the alert path once it's configured:

```bash
sudo systemctl start labtracker-alert@test.service; journalctl -u labtracker-alert@test -n 5
```

Leave heavier tooling (Prometheus, Grafana, Netdata) for later. On a 2-core,
8 GB host with about 10 users it would cost more than it tells you.
