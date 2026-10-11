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
| `Features:McbImport` | no | enables Admin → "Import MCB equipment" (adds the client's equipment list; safe to re-run). Set `Features__McbImport=true` on a deployment only while importing; imported science officers start inactive with placeholder emails |

Frontend: `VITE_API_BASE_URL` (build time) only if the API is on a different
origin; it defaults to same-origin `/api`.

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
