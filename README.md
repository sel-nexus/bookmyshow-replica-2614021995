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
