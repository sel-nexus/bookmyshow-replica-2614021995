# BookMyShow Replica

A demo cinema booking flow with an in-memory browser session and a SQLite-backed API. The intended journey is **login → OTP → choose a movie/theatre → preset checkout → confirmation**. The checkout accepts only the fixed seats `A1`, `A2`, and `A3` for `₹450`; payment fields are demonstrative and no payment-instrument information is submitted. A confirmation is transient and is rendered only from the successful booking response, so refreshing it or visiting it directly safely returns the user to browsing.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (only for the container workflow)

## Local development

Install each tier separately:

```sh
cd backend && npm ci
cd ../frontend && npm ci
```

Copy the supplied environment examples to local runtime files and adjust values for your machine:

```sh
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env.local
```

Start the API in one terminal:

```sh
cd backend
npm run dev
```

Start the Next.js frontend in another terminal:

```sh
cd frontend
npm run dev
```

Open `http://localhost:3000`. The demo mobile number may be any 10–15 digit number (for example, `9876543210`); the demo OTP is `1234`.

### Environment

Backend values are documented in `backend/.env.example`: `PORT`, `DATABASE_PATH`, `JWT_SECRET`, `JWT_ISSUER`, and `CORS_ORIGIN`. Frontend uses `NEXT_PUBLIC_API_BASE_URL` from `frontend/.env.example` (normally `http://localhost:4000` for local development). Replace the development JWT secret before deployment.

## Appearance

Use the **Appearance** selector in the shared header to choose **Light** or **Dark** with a mouse or the keyboard (Tab, then arrow keys). Light is the default even when the operating system prefers dark. An explicit choice is saved as `bookmyshow-theme` in browser local storage and restored before paint. Only `light` and `dark` are accepted; missing, invalid or unreadable preferences fall back to Light. Blocked storage getters, reads, writes, or quota errors do not prevent switching for the current session. With unavailable storage, reload returns to Light.

Appearance changes preserve the current route, authentication, booking selection and unsaved form fields. No account setting or cross-device synchronization is introduced. The existing Light colors, fonts and spacing remain unchanged; Dark extends the warm cinema red/amber palette across all six screens, including selected seats, disabled payment controls, status/error text and confirmation. Existing booking controls without Light CSS get Dark-only color/state rules rather than a Light redesign. Google font delivery remains external and is not controlled by the theme. Human visual acceptance is still required.

### Dark-mode tests

Run the slice from `frontend`:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.config.ts __tests__/theme.test.tsx
```

Run the written browser spec separately from `frontend`, using the existing Playwright configuration (starts real frontend and backend; no network mocking):

```sh
node node_modules/@playwright/test/cli.js test e2e/theme.spec.ts
```

The slice covers preference validation, storage failures, bootstrap execution, hydration, accessible selection and preserved child state. The browser spec covers keyboard focus, persistence/navigation/reload, invalid/unavailable storage, mobile auth error, real booking in both modes, unchanged payment drafts and in-flight processing. HTML, ARIA snapshots, computed style/contrast evidence and desktop/mobile Dark screenshots are attached to the browser results. Browser execution and build verification are separate release checks; writing the spec is not evidence of a browser pass.

## Verification

Run the requested checks from the repository root:

```sh
cd frontend && node node_modules/vitest/vitest.mjs run --config vitest.config.ts
cd frontend && NODE_ENV=production node node_modules/next/dist/bin/next build
cd backend && node node_modules/typescript/bin/tsc
```

The Playwright confirmation journey spec is at `frontend/e2e/confirmation.spec.ts`; run it with your live frontend and backend using the project Playwright configuration when available.

## Containers

Build and run the two application services:

```sh
docker compose up --build
```

The frontend is published on port 3000 and the backend on port 4000. Compose provisions no database service: SQLite is the embedded declared database. The backend database is mounted at `/data/bookmyshow.db` through the named `backend-data` volume. Preserve that named volume during routine container replacement; removing it (for example, `docker compose down -v`) permanently removes the durable SQLite data.

The compose frontend build/runtime uses `NEXT_PUBLIC_API_BASE_URL=http://backend:4000` only for the container topology. Do not ship a browser `localhost` API base URL for that topology.
