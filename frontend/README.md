# LabTracker frontend

React 19 + Vite + TypeScript, Tailwind 4 with shadcn/ui (Radix), TanStack
Query and React Router. See the [root README](../README.md) for setup,
configuration and deployment.

```bash
npm install
npm run dev     # http://localhost:5173, proxies /api to http://localhost:5119
npm run lint
npm run build
```

## Layout

- `src/features/<area>/`: one folder per area (`admin`, `bookings`,
  `equipment`, `usage`, `reports`, `dashboard`, `auth`, `account`,
  `notifications`, `onboarding`, `external`), holding its pages, dialogs and
  hooks.
- `src/components/`: shared building blocks. `ui/` holds the shadcn
  primitives; others include `responsive-list.tsx` (a table on desktop, cards
  on phones) and the UCT/MCB brand marks.
- `src/lib/api-client.ts`: the fetch wrapper. It calls same-origin `/api`
  unless `VITE_API_BASE_URL` is set.
- `nginx.conf`: production server for the built app. It proxies `/api`,
  `/health` and read-only `/storage` photos, and restores visitor IPs behind
  the Cloudflare Tunnel.

## Build-time settings

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API origin, only when it isn't the same origin as the app |
| `VITE_GOOGLE_CLIENT_ID` | shows "Sign in with Google"; same value as the API's `Google:ClientId` |
