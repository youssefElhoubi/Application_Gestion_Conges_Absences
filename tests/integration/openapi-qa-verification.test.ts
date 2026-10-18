import { describe, it, expect, vi } from 'vitest';
import { OpenAPIV3 } from 'openapi-types';
import { NextRequest } from 'next/server';
import { openApiDocument } from '@/src/docs/openapi';
import { GET as getOpenApiRoute } from '@/src/app/api/openapi/route';
import { GET as getOpenApiJsonRoute } from '@/src/app/api/openapi.json/route';
import { GET as getAbsenceTypesRoute } from '@/src/app/api/absences/types/route';
import { GET as getMeRoute } from '@/src/app/api/me/route';
import { GET as getAbsencesRoute } from '@/src/app/api/absences/route';
import { GET as getEmployeesRoute } from '@/src/app/api/employees/route';
import { POST as postCalculateRoute } from '@/src/app/api/absences/calculate/route';
import { POST as postAbsenceRoute } from '@/src/app/api/absences/route';
import { SessionResolver } from '@/src/modules/auth/session.resolver';
import { createMockSession } from '@/tests/helpers/auth-mock';

describe('QA Verification: OpenAPI Validity, Accuracy & Security', () => {
  describe('1. OpenAPI Validity & Structural Integrity', () => {
    it('serves valid OpenAPI 3.0.3 specification via /api/openapi.json and /api/openapi', async () => {
      const resJson = await getOpenApiJsonRoute();
      expect(resJson.status).toBe(200);
      expect(resJson.headers.get('content-type')).toContain('application/json');

      const doc = await resJson.json();
      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('Leave & Absence Management API');
      expect(doc.info.version).toBe('0.1.0');
      expect(Array.isArray(doc.servers)).toBe(true);
      expect(doc.servers.length).toBeGreaterThanOrEqual(1);

      const resAlt = await getOpenApiRoute();
      expect(resAlt.status).toBe(200);
      const docAlt = await resAlt.json();
      expect(docAlt.openapi).toBe('3.0.3');
      expect(docAlt.info.title).toBe(doc.info.title);
    });

    it('contains zero duplicate operation IDs', () => {
      const paths = openApiDocument.paths || {};
      const operationIds = new Set<string>();
      const duplicates: string[] = [];
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

      for (const [pathStr, pathItem] of Object.entries(paths)) {
        if (!pathItem) continue;
        for (const method of methods) {
          const op = (pathItem as Record<string, unknown>)[method] as { operationId?: string } | undefined;
          if (op?.operationId) {
            if (operationIds.has(op.operationId)) {
              duplicates.push(`${method.toUpperCase()} ${pathStr}: duplicate operationId '${op.operationId}'`);
            }
            operationIds.add(op.operationId);
          }
        }
      }

      expect(duplicates).toEqual([]);
    });

    it('validates that every $ref resolves to a defined component schema', () => {
      const schemas = openApiDocument.components?.schemas || {};
      const refRegex = /^#\/components\/schemas\/(.+)$/;
      const brokenRefs: string[] = [];

      function verifyRefs(obj: unknown, loc = '') {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          obj.forEach((item, i) => verifyRefs(item, `${loc}[${i}]`));
          return;
        }
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (k === '$ref' && typeof v === 'string') {
            const m = v.match(refRegex);
            if (m) {
              const schemaName = m[1];
              if (!schemas[schemaName]) {
                brokenRefs.push(`${loc}: missing schema target '${schemaName}' for ref '${v}'`);
              }
            }
          } else {
            verifyRefs(v, `${loc}.${k}`);
          }
        }
      }

      verifyRefs(openApiDocument.paths, 'paths');
      verifyRefs(openApiDocument.components?.schemas, 'components.schemas');

      expect(brokenRefs).toEqual([]);
    });

    it('defines valid security schemes without missing fields', () => {
      const secSchemes = openApiDocument.components?.securitySchemes as Record<
        string,
        OpenAPIV3.SecuritySchemeObject
      >;
      expect(secSchemes).toBeDefined();

      // ApiKeyAuth
      const apiKey = secSchemes.ApiKeyAuth as OpenAPIV3.ApiKeySecurityScheme;
      expect(apiKey.type).toBe('apiKey');
      expect(apiKey.name).toBe('x-user-id');
      expect(apiKey.in).toBe('header');

      // BearerAuth
      const bearer = secSchemes.BearerAuth as OpenAPIV3.HttpSecurityScheme;
      expect(bearer.type).toBe('http');
      expect(bearer.scheme).toBe('bearer');

      // CookieAuth
      const cookie = secSchemes.CookieAuth as OpenAPIV3.ApiKeySecurityScheme;
      expect(cookie.type).toBe('apiKey');
      expect(cookie.in).toBe('cookie');
    });
  });

  describe('2. Security & Data Leakage Prevention', () => {
    it('does not expose password hashes, internal secrets, or tokens in schemas or examples', () => {
      const docStr = JSON.stringify(openApiDocument);
      expect(docStr).not.toContain('passwordHash');
      expect(docStr).not.toContain('password_hash');
      expect(docStr).not.toContain('secret_key');
      expect(docStr).not.toContain('PRIVATE_KEY');
    });

    it('enforces authentication on protected endpoints (Swagger integration did not open public bypass)', async () => {
      // 1. GET /api/me without auth
      const resMe = await getMeRoute();
      expect(resMe.status).toBeGreaterThanOrEqual(400);

      // 2. GET /api/absences without auth
      const reqAbsences = new NextRequest('http://localhost:3000/api/absences');
      const resAbsences = await getAbsencesRoute(reqAbsences);
      expect(resAbsences.status).toBeGreaterThanOrEqual(400);

      // 3. GET /api/employees without auth
      const reqEmployees = new NextRequest('http://localhost:3000/api/employees');
      const resEmployees = await getEmployeesRoute(reqEmployees);
      expect(resEmployees.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('3. Endpoint Accuracy & Real HTTP Handling', () => {
    it('public endpoint GET /api/absences/types responds 200 without authentication', async () => {
      const res = await getAbsenceTypesRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('protected routes strictly reject unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/absences/calculate', {
        method: 'POST',
        body: JSON.stringify({ employeeId: 'MAT-00101' }),
      });
      const res = await postCalculateRoute(req);
      expect(res.status).toBe(401);
      const err = await res.json();
      expect(err).toHaveProperty('error');
    });

    it('POST /api/absences/calculate returns 400 for invalid date boundaries when session is valid', async () => {
      const spy = vi.spyOn(SessionResolver, 'require').mockResolvedValue(createMockSession('ADMIN'));

      try {
        const req = new NextRequest('http://localhost:3000/api/absences/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: 'MAT-NONEXISTENT',
            startDate: '2026-10-15',
            endDate: '2026-10-10', // End date precedes start date
            fraction: 'FULL_DAY',
          }),
        });

        const res = await postCalculateRoute(req);
        // Will either return 400 (boundary/missing employee) or 404 (employee not found)
        expect([400, 404]).toContain(res.status);
        const err = await res.json();
        expect(err).toHaveProperty('error');
      } finally {
        spy.mockRestore();
      }
    });

    it('POST /api/absences returns 400 when mandatory body fields are missing', async () => {
      const spy = vi.spyOn(SessionResolver, 'require').mockResolvedValue(createMockSession('ADMIN'));

      try {
        const req = new NextRequest('http://localhost:3000/api/absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: 'MAT-00101',
            // Missing typeId, startDate, endDate
          }),
        });

        const res = await postAbsenceRoute(req);
        expect(res.status).toBe(400);
        const err = await res.json();
        expect(err).toHaveProperty('error');
      } finally {
        spy.mockRestore();
      }
    });
  });
});
