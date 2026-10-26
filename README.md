# Application de Gestion des Congés et Absences

Enterprise web application for statutory leave management, paid leave dynamic accruals, working days calculation under Moroccan Labor Law (*Code du Travail - Law 65-99*), public holiday recovery credits, and role-based approval workflows.

Built with Next.js 16 (App Router, Turbopack), TypeScript, Prisma ORM 7, PostgreSQL, and Docker Compose.

---

## 1. Quick Start with Docker Compose

Docker Compose provides a complete, isolated local environment with PostgreSQL, automated database migrations, seeding, the Next.js web application, and Prisma Studio.

### Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (v24.0+) & Docker Compose v2.20+
- Host ports `3000` (Web), `5432` (PostgreSQL), and `5555` (Prisma Studio) available.

### Environment Variable Setup
By default, `docker-compose.yml` provides sensible local development defaults. You can customize them by creating a `.env` file from the template:
```bash
cp .env.example .env
```

| Variable | Description | Docker Default | Local Host Default |
|---|---|---|---|
| `POSTGRES_USER` | Database username | `myuser` | `myuser` |
| `POSTGRES_PASSWORD` | Database user password | `mypassword` | `mypassword` |
| `POSTGRES_DB` | Database name | `mydatabase` | `mydatabase` |
| `POSTGRES_PORT` | Exposed PostgreSQL host port | `5432` | `5432` |
| `PORT` | Web application port | `3000` | `3000` |
| `PRISMA_STUDIO_PORT`| Prisma Studio host port | `5555` | `5555` |
| `JWT_ACCESS_SECRET` | Secret key for JWT signing (>= 32 chars in production) | Pre-configured dev key | Pre-configured dev key |
| `DATABASE_URL` | Full connection string (used by local scripts/Prisma CLI) | Inter-container: `postgresql://myuser:mypassword@db:5432/mydatabase?schema=public` | Host: `postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public` |

---

### Starting the Stack
Start all services in detached mode:
```bash
docker compose up -d
```

### Deterministic Startup Sequence
The stack initializes using strict health and completion conditions:
1. **`db` (PostgreSQL 15)** starts and passes its healthcheck (`pg_isready`).
2. **`seeder`** starts once `db` is healthy, executes `npx prisma migrate deploy`, runs `npx prisma db seed`, and reports success (`Exited (0)`).
3. **`web` (Next.js Application)** starts **only after** `seeder` completes successfully (`condition: service_completed_successfully`).
4. **`prisma-studio`** starts as soon as `db` is healthy and binds to `0.0.0.0:5555` via a dedicated host-binding hook.

---

### Accessing the Services
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Interactive API Documentation (Swagger)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Prisma Studio**: [http://localhost:5555](http://localhost:5555)

#### Seeded Accounts for Testing
- **HR Administrator**: `admin@entreprise.ma` / `AdminPassword123!` (Role: `ADMIN`, Matricule: `MAT-0042`)
- **Employee**: `fz.alami@entreprise.ma` / `EmployeePassword123!` (Role: `EMPLOYEE`, Matricule: `EMP-0101`)

---

### Inspecting Service Logs
To view logs for all or specific services:
```bash
# View status of all containers
docker compose ps -a

# Follow logs across all services
docker compose logs -f

# Follow logs for specific services
docker compose logs -f web
docker compose logs -f db
docker compose logs seeder
docker compose logs -f prisma-studio
```

---

### Safe Database Operations

#### Rerunning Migrations Safely
Migrations are automatically applied by the `seeder` container during startup. To run pending migrations independently without restarting the entire stack:
```bash
docker compose run --rm seeder npx prisma migrate deploy
```

#### Rerunning the Database Seeder
The seed script is strictly idempotent (uses unique constraints, `upsert`, and existence checks). Rerunning it is safe and will not corrupt or duplicate data:
```bash
docker compose run --rm seeder
```

#### Accessing PostgreSQL via CLI inside Docker
```bash
docker compose exec db psql -U myuser -d mydatabase
```

---

### Stopping Containers (Safe vs. Destructive)

> [!IMPORTANT]
> **Safe Shutdown (Preserves Data)**
> ```bash
> docker compose down
> ```
> This stops and removes containers and networks while **preserving** the persistent PostgreSQL volume (`postgres_data`). All database records, sessions, and state remain intact.

> [!CAUTION]
> **Destructive Shutdown (DELETES Database Volume)**
> ```bash
> docker compose down -v
> ```
> The `-v` / `--volumes` flag deletes the named volume `postgres_data`. **Never run this as a routine troubleshooting step**, as all database data will be permanently wiped.

---

### Diagnosing Common Startup Failures

1. **`web` container does not start (`waiting on seeder`)**:
   - Check `docker compose logs seeder`.
   - If a migration or seed step fails, `seeder` exits with code 1, which intentionally prevents `web` from starting.
   - Fix the issue in migrations or seed data and rerun: `docker compose run --rm seeder`.
2. **Port conflict on `3000`, `5432`, or `5555`**:
   - If a local PostgreSQL or dev server is running on the host, override the exposed port in `.env` (e.g. `POSTGRES_PORT=5433` or `PRISMA_STUDIO_PORT=5556`) and run `docker compose up -d`.
3. **Prisma Studio unreachable from host**:
   - Prisma Studio in Prisma 7 binds strictly to `127.0.0.1` by default. This project includes `scripts/prisma-studio-host.cjs` to intercept this and bind to `0.0.0.0:5555`.
   - Ensure the Studio container was built with the `studio` target: `docker compose build prisma-studio`.
4. **Authentication 500 error in production mode**:
   - `JWT_ACCESS_SECRET` must be set with at least 32 characters in production mode.
   - For local HTTP development, `COOKIE_SECURE` should be set to `false`.

---

## 2. Installation & Running Locally (Without Docker)

### Prerequisites
- **Node.js**: v20 or higher
- **PostgreSQL**: 15+ running locally
- **Package Manager**: `npm`

### Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Database Client Generation
Generate the Prisma client:
```bash
npx prisma generate
```

### Apply Migrations & Seed Locally
```bash
npx prisma migrate deploy
npm run db:seed
```

### Start the Development Server
```bash
npm run dev
```
The application will be running at [http://localhost:3000](http://localhost:3000).

---

## 3. Interactive API Documentation & OpenAPI Specification

The project integrates an interactive Swagger UI viewer and an OpenAPI 3.0.3 specification.

| Resource | Route / URL | Description |
|---|---|---|
| **Swagger UI Page** | [`/api-docs`](http://localhost:3000/api-docs) | Interactive API exploration and live execution interface. |
| **Swagger UI Short Link** | [`/docs`](http://localhost:3000/docs) | Automatic server-side redirect to `/api-docs`. |
| **OpenAPI Specification (JSON)** | [`/api/openapi.json`](http://localhost:3000/api/openapi.json) | Standard JSON OpenAPI 3.0.3 specification document. |
| **OpenAPI Specification (Alias)** | [`/api/openapi`](http://localhost:3000/api/openapi) | Convenience alias returning the identical specification. |

### Architecture
- **Specification Source**: Maintained in source code under `src/docs/openapi/` using official `openapi-types` TypeScript definitions.
- **Dynamic Serving**: Exposed directly via Next.js App Router handlers (`/api/openapi/route.ts` and `/api/openapi.json/route.ts`).
- **Client Rendering**: Rendered on `/api-docs` via `swagger-ui-dist` wrapped in a client-only boundary.

---

## 4. How to Authenticate in Swagger UI

The API supports three authentication mechanisms:
1. **User ID Header (`x-user-id`)**:
   - Primary mechanism for developer testing, automated API clients, and Swagger UI.
   - Enter a valid user ID (e.g. `usr-admin-default`).
2. **Bearer Token (`Authorization: Bearer <token>`)**:
   - Standard HTTP Bearer header (`BearerAuth` in Swagger UI). Obtainable via `POST /api/auth/login`.
3. **Session Cookies (`access_token` / `refresh_token`)**:
   - Automatically included when using the application in a browser.

---

## 5. Testing & Quality Verification Commands

| Command | Purpose |
|---|---|
| `npx tsc --noEmit` | Strict TypeScript compilation check across all application and OpenAPI files. |
| `npx vitest run tests/integration/openapi-coverage.test.ts` | Asserts 100% coverage of route paths, operations, and schema reference integrity. |
| `npx vitest run tests/integration/openapi-qa-verification.test.ts` | Validates OpenAPI 3.0.3 validity, security boundaries, and live endpoint accuracy. |
| `npm run test` | Full regression test suite. |
| `npm run build` | Verifies Next.js production compilation with Turbopack. |