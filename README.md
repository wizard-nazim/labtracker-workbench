# LabTracker

Equipment booking and usage tracking for research labs: departments, rooms and
facilities, equipment with assigned Science Officers, bookings (internal ones are
auto-approved, external ones need approval), usage records, reports and in-app
notifications.

| Part | Stack |
|---|---|
| `backend/` | .NET 10 Web API, EF Core 10 + Npgsql (PostgreSQL), S3-compatible blob storage for equipment images |
| `frontend/` | React 19 + Vite + TypeScript, Tailwind 4, shadcn/ui, TanStack Query |

Roles: **Super Admin** (everything), **Science Officer** (equipment they're assigned
to or whose facility they oversee), **Principal Investigator** and **Researcher**
(their own/their group's bookings).

## Local development

Prerequisites: .NET 10 SDK, Node 22+, Docker.

```bash
# 1. Postgres + MinIO
cd backend
cp .env.example .env
docker compose up -d

# 2. API on http://localhost:5119 (Development: applies sample data on start)
dotnet tool restore
dotnet ef database update -p src/LabTracker.Infrastructure -s src/LabTracker.Api
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)" --project src/LabTracker.Api
dotnet run --project src/LabTracker.Api

# 3. Frontend on http://localhost:5173 (proxies /api to the API)
cd ../frontend
npm install
npm run dev
```

Development logins (password `ChangeMe123!`): `admin@labtracker.local`,
`so@labtracker.local`, `researcher@labtracker.local`.

### Tests

```bash
cd backend && dotnet test LabTracker.slnx   # unit + Postgres integration tests (needs Docker)
cd frontend && npm run lint && npm run build
```

CI (`.github/workflows/ci.yml`) runs all of the above, checks that no model change
is missing a migration, and builds both Docker images.

### Database changes

```bash
cd backend
dotnet ef migrations add <Name> -p src/LabTracker.Infrastructure -s src/LabTracker.Api
```

## Configuration

API settings (environment variables use `__` for `:`, e.g. `Jwt__SigningKey`):

| Setting | Required | Notes |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | yes | Npgsql connection string |
| `Jwt:SigningKey` | yes | at least 32 bytes; the API refuses to start otherwise |
| `Jwt:Issuer`, `Jwt:Audience` | yes | defaults in `appsettings.json` |
| `Minio:ServiceUrl`, `AccessKey`, `SecretKey`, `Bucket`, `PublicBaseUrl` | for images | any S3-compatible store |
| `Cors:AllowedOrigins` | only cross-origin | not needed when the frontend is served from the same origin |
| `Database:MigrateOnStartup` | no | apply pending migrations when the API starts |
| `Bootstrap:AdminEmail`, `Bootstrap:AdminPassword` | first start | creates the first Super Admin on an empty database; remove afterwards |
| `Features:DemoDataReset` | no | enables Admin → "Reset demo data" (wipes everything). On only in Development |
| `Google:ClientId` | no | OAuth client ID for "Sign in with Google"; empty disables it. The client secret is not used |
| `RateLimiting:Login:PermitLimit`, `WindowSeconds` | no | sign-in attempts allowed per client IP per window (default 10 per 60 s); excess gets `429` |
| `ForwardedHeaders:ForwardLimit` | no | proxy hops whose `X-Forwarded-For` entries are trusted (default 1). Keep 1 whenever the API is publicly reachable: a higher value lets a client spoof its IP |

Frontend (build time): `VITE_API_BASE_URL` only if the API is on a different
origin (it defaults to same-origin `/api`), and `VITE_GOOGLE_CLIENT_ID` to show
the Google button (same value as `Google:ClientId`).

**Google sign-in** only lets in people who already have an active LabTracker
login, matched by email; it never creates accounts. It accepts Gmail addresses
and Google Workspace accounts only: for any other address Google doesn't vouch
for the current owner, so those users sign in with their password. In Google Cloud Console →
Credentials → the OAuth client, add every site origin under *Authorized
JavaScript origins* (`http://localhost`, `http://localhost:5173`, and the
production URL). No redirect URIs are needed. While the consent screen is in
*Testing*, only listed test users can sign in.

Health check: `GET /health` (also reports whether the database is reachable).

## Production deployment

`docker-compose.prod.yml` runs the API and an nginx container that serves the
built frontend and proxies `/api` to the API. PostgreSQL and object storage are
external.

```bash
cp .env.production.example .env.production   # fill in; it's gitignored
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- **Database**: for Supabase, use the direct or session-pooler connection
  (port 5432) with `SSL Mode=Require`; the transaction pooler (6543) doesn't
  suit migrations.
- **First login**: set `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` for the
  first start, sign in, change the password, then remove them.
- **TLS**: terminate HTTPS in front of the web container (load balancer or
  reverse proxy) and set `ALLOWED_HOSTS` to your hostname.

### Vercel (frontend) + Railway (API)

The SPA can be hosted on Vercel and the API on Railway instead of the compose
stack. `frontend/vercel.json` rewrites `/api/*` and `/health` to the API, so the
browser stays same-origin and no CORS setup is needed.

**Railway** (API): new service from this repo, root directory `backend`
(it builds `backend/Dockerfile`). Variables:

| Variable | Value |
|---|---|
| `ConnectionStrings__DefaultConnection` | Supabase **session pooler** string (Connect → Session pooler; port 5432), as `Host=...;Port=5432;Database=postgres;Username=postgres.<ref>;Password=...;SSL Mode=Require`. The direct `db.<ref>.supabase.co` host is IPv6-only |
| `Jwt__SigningKey` | `openssl rand -base64 48` |
| `Google__ClientId` | the OAuth client ID |
| `Database__MigrateOnStartup` | `true` |
| `Bootstrap__AdminEmail`, `Bootstrap__AdminPassword` | first start only, then remove |
| `Minio__ServiceUrl`, `Minio__AccessKey`, `Minio__SecretKey`, `Minio__Bucket`, `Minio__PublicBaseUrl` | S3 storage, e.g. Supabase Storage's S3 endpoint |
| `PORT` | `8080` |

Set the health check path to `/health` and generate a public domain.

**Vercel** (frontend): import the repo with root directory `frontend`
(framework Vite, build `npm run build`, output `dist`). Replace
`YOUR-RAILWAY-API.up.railway.app` in `frontend/vercel.json` with the Railway
domain. Variable: `VITE_GOOGLE_CLIENT_ID`. Then add the Vercel URL to the
Google client's authorized JavaScript origins.

Requests reach the API through Vercel and then Railway's proxy, so the per-IP
limit sees Vercel's addresses and many users can share one bucket. If people
hit `429`s during normal use, raise `RateLimiting__Login__PermitLimit` (e.g. 60)
rather than `ForwardedHeaders__ForwardLimit`: the Railway domain is public, and
trusting more forwarded hops would let anyone fake their IP. Password guessing
is also capped per account, which no IP trick gets around: after 10 attempts in
15 minutes, that account's password sign-in returns `429` for the rest of the
window. The trade-off is that someone who knows a user's email can lock them out
of password sign-in for up to 15 minutes; users with a Gmail or Google Workspace
address can still use Google sign-in meanwhile.

**Supabase**: the app talks to Postgres directly and does not use Supabase's
Data API. Disable it (Project Settings → Data API), or the public publishable
key could read and write the app's tables over REST, since they have no RLS.
Schema changes come from EF migrations, not a `supabase/` folder.
