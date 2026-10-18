# Application de Gestion des Congés et Absences

Enterprise web application for statutory leave management, paid leave dynamic accruals, working days calculation under Moroccan Labor Law (*Code du Travail - Law 65-99*), public holiday recovery credits, and role-based approval workflows.

---

## 1. Prerequisites & Environment Setup

- **Node.js**: v20 or higher
- **PostgreSQL**: 14+ with an initialized database
- **Package Manager**: `npm`

### Environment Variables
Copy the template file to configure your local environment:
```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with public schema | `postgresql://user:pass@localhost:5432/mydb?schema=public` |
| `PORT` | Local HTTP port (optional) | `3000` |
| `NODE_ENV` | Application runtime environment | `development` |

---

## 2. Installation & Running Locally

### Install Dependencies
Due to package ecosystem peer dependency constraints, install using:
```bash
npm install --legacy-peer-deps
```

### Database Client Generation
Generate the Prisma client:
```bash
npx prisma generate
```

### Start the Development Server
```bash
npm run dev
```
The application will be running at [http://localhost:3000](http://localhost:3000).

### Build & Run Production Bundle
```bash
npm run build
npm run start
# Alternatively for standalone output:
node .next/standalone/server.js
```

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
- **Dynamic Serving**: Exposed directly via Next.js App Router handlers (`/api/openapi/route.ts` and `/api/openapi.json/route.ts`). There is no out-of-band build step required to generate the JSON.
- **Client Rendering**: Rendered on `/api-docs` via `swagger-ui-dist` wrapped in a client-only boundary to avoid React 19 SSR hydration mismatches.

---

## 4. How to Authenticate in Swagger UI

The API supports three authentication mechanisms:
1. **User ID Header (`x-user-id`)**:
   - Primary mechanism for developer testing, automated API clients, and Swagger UI.
   - Click the green **Authorize** button at the top of Swagger UI and enter a valid user ID (e.g. `usr-admin-default`).
   - *Auto-fallback*: For local testing, Swagger UI automatically falls back to `usr-admin-default` on live requests if no token is entered.
2. **Bearer Token (`Authorization: Bearer <token>`)**:
   - Standard HTTP Bearer header (`BearerAuth` in Swagger UI).
3. **Session Cookies (`auth_user_id` / `session_token`)**:
   - Automatically included when using the application in a browser with active session cookies.

> **Authorization Invariant**: Approvers (`HR_MANAGER`, `SUPERVISOR`) cannot approve or reject their own requests (self-approval prohibited).

---

## 5. Developer Guide: How to Document a New Endpoint

When adding or modifying an HTTP route handler in `src/app/api/`:

### Step 1: Update or Add Schemas
If new request or response payloads are introduced, add their schemas in `src/docs/openapi/schemas/<feature>.schemas.ts`:
```typescript
import { OpenAPIV3 } from 'openapi-types';

export const myFeatureSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  MyInputDto: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, example: 'Sample Name' },
    },
    required: ['name'],
  },
};
```

### Step 2: Define Path & Operations
Add the path definition in `src/docs/openapi/paths/<feature>.paths.ts`:
```typescript
import { OpenAPIV3 } from 'openapi-types';

export const myFeaturePaths: OpenAPIV3.PathsObject = {
  '/api/my-feature': {
    get: {
      tags: ['My Feature'],
      summary: 'Summary of the operation',
      responses: {
        '200': {
          description: 'Successful response',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MyOutputDto' } } },
        },
      },
    },
  },
};
```

### Step 3: Register in Root OpenAPI Document
Import and spread the new path and schema objects in `src/docs/openapi/index.ts`.

### Step 4: Validate
Run the automated test suite to ensure 100% path coverage and reference integrity:
```bash
npx vitest run tests/integration/openapi-coverage.test.ts tests/integration/openapi-qa-verification.test.ts
```

---

## 6. Testing & Quality Verification Commands

| Command | Purpose |
|---|---|
| `npx tsc --noEmit` | Strict TypeScript compilation check across all application and OpenAPI files. |
| `npx vitest run tests/integration/openapi-coverage.test.ts` | Asserts 100% coverage of all 21 route paths, 34 operations, and schema reference integrity. |
| `npx vitest run tests/integration/openapi-qa-verification.test.ts` | Validates OpenAPI 3.0.3 validity, security boundaries, and live endpoint accuracy. |
| `npm run test` | Full regression test suite (28 test suites, 210+ tests). |
| `npm run build` | Verifies Next.js production compilation with Turbopack. |
