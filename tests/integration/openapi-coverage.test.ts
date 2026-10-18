import { describe, it, expect } from 'vitest';
import { OpenAPIV3 } from 'openapi-types';
import { openApiDocument } from '@/src/docs/openapi';
import { GET as getOpenApiRoute } from '@/src/app/api/openapi/route';
import { GET as getOpenApiJsonRoute } from '@/src/app/api/openapi.json/route';

describe('OpenAPI 3.0.3 Specification & Endpoint Coverage', () => {
  it('Scenario 1: Root OpenAPI document has valid metadata and version', () => {
    expect(openApiDocument.openapi).toBe('3.0.3');
    expect(openApiDocument.info.title).toContain('Leave & Absence Management API');
    expect(openApiDocument.info.version).toBe('0.1.0');
    expect(openApiDocument.servers).toBeDefined();
    expect(openApiDocument.servers?.length).toBeGreaterThanOrEqual(1);
  });

  it('Scenario 2: Security schemes include ApiKeyAuth (x-user-id) and BearerAuth', () => {
    const securitySchemes = openApiDocument.components?.securitySchemes as Record<string, OpenAPIV3.SecuritySchemeObject>;
    expect(securitySchemes).toBeDefined();
    expect(securitySchemes.ApiKeyAuth).toBeDefined();
    expect((securitySchemes.ApiKeyAuth as OpenAPIV3.ApiKeySecurityScheme).name).toBe('x-user-id');
    expect(securitySchemes.BearerAuth).toBeDefined();
    expect((securitySchemes.BearerAuth as OpenAPIV3.HttpSecurityScheme).scheme).toBe('bearer');
  });

  it('Scenario 3: Covers all 10 feature tags including Authentication & Sessions', () => {
    const tags = openApiDocument.tags?.map((t) => t.name);
    expect(tags).toContain('Authentication & Sessions');
    expect(tags).toContain('Absences');
    expect(tags).toContain('Employees');
    expect(tags).toContain('Counters');
    expect(tags).toContain('Dashboard');
    expect(tags).toContain('Public Holidays');
    expect(tags).toContain('Holiday Work Credits');
    expect(tags).toContain('Leave Rules');
    expect(tags).toContain('Sites');
    expect(tags).toContain('Current User');
  });

  it('Scenario 4: Verifies 100% of all 26 backend route paths and 40 operations exist in paths', () => {
    const paths = openApiDocument.paths ?? {};

    // 1. Absences
    expect(paths['/api/absences']?.get).toBeDefined();
    expect(paths['/api/absences']?.post).toBeDefined();
    expect(paths['/api/absences/calculate']?.post).toBeDefined();
    expect(paths['/api/absences/types']?.get).toBeDefined();
    expect(paths['/api/absences/{id}']?.get).toBeDefined();
    expect(paths['/api/absences/{id}']?.put).toBeDefined();
    expect(paths['/api/absences/{id}/approve']?.post).toBeDefined();
    expect(paths['/api/absences/{id}/reject']?.post).toBeDefined();
    expect(paths['/api/absences/{id}/cancel']?.post).toBeDefined();

    // 2. Employees
    expect(paths['/api/employees']?.get).toBeDefined();
    expect(paths['/api/employees']?.post).toBeDefined();
    expect(paths['/api/employees/{id}']?.get).toBeDefined();
    expect(paths['/api/employees/{id}']?.patch).toBeDefined();
    expect(paths['/api/employees/{id}/counters']?.get).toBeDefined();

    // 3. Counters
    expect(paths['/api/counters']?.get).toBeDefined();

    // 4. Dashboard
    expect(paths['/api/dashboard/metrics']?.get).toBeDefined();
    expect(paths['/api/dashboard/summary']?.get).toBeDefined();

    // 5. Public Holidays
    expect(paths['/api/public-holidays']?.get).toBeDefined();
    expect(paths['/api/public-holidays']?.post).toBeDefined();
    expect(paths['/api/public-holidays/{id}']?.get).toBeDefined();
    expect(paths['/api/public-holidays/{id}']?.patch).toBeDefined();
    expect(paths['/api/public-holidays/{id}']?.delete).toBeDefined();

    // 6. Holiday Work Credits
    expect(paths['/api/holiday-work-credits']?.get).toBeDefined();
    expect(paths['/api/holiday-work-credits']?.post).toBeDefined();
    expect(paths['/api/holiday-work-credits/{id}']?.get).toBeDefined();
    expect(paths['/api/holiday-work-credits/{id}']?.patch).toBeDefined();
    expect(paths['/api/holiday-work-credits/{id}']?.delete).toBeDefined();

    // 7. Leave Rules
    expect(paths['/api/leave-rules']?.get).toBeDefined();
    expect(paths['/api/leave-rules']?.post).toBeDefined();

    // 8. Sites
    expect(paths['/api/sites']?.get).toBeDefined();
    expect(paths['/api/sites']?.post).toBeDefined();
    expect(paths['/api/sites/{id}']?.get).toBeDefined();
    expect(paths['/api/sites/{id}']?.patch).toBeDefined();

    // 9. Current User
    expect(paths['/api/me']?.get).toBeDefined();

    // 10. Authentication & Sessions
    expect(paths['/api/auth/login']?.post).toBeDefined();
    expect(paths['/api/auth/refresh']?.post).toBeDefined();
    expect(paths['/api/auth/logout']?.post).toBeDefined();
    expect(paths['/api/auth/me']?.get).toBeDefined();
    expect(paths['/api/auth/sessions']?.get).toBeDefined();
    expect(paths['/api/auth/sessions']?.post).toBeDefined();

    // Count operations
    let totalOperations = 0;
    for (const [, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      for (const m of methods) {
        if ((pathItem as Record<string, unknown>)[m]) totalOperations++;
      }
    }
    expect(totalOperations).toBe(40);
  });

  it('Scenario 5: Public endpoints (/api/absences/types and /api/auth/login) have empty security array', () => {
    const typesOp = openApiDocument.paths?.['/api/absences/types']?.get;
    expect(typesOp).toBeDefined();
    expect(typesOp?.security).toEqual([]);

    const loginOp = openApiDocument.paths?.['/api/auth/login']?.post;
    expect(loginOp).toBeDefined();
    expect(loginOp?.security).toEqual([]);
  });

  it('Scenario 6: Route handlers return valid JSON with proper headers', async () => {
    const res1 = await getOpenApiRoute();
    expect(res1.status).toBe(200);
    expect(res1.headers.get('content-type')).toContain('application/json');
    const json1 = await res1.json();
    expect(json1.openapi).toBe('3.0.3');

    const res2 = await getOpenApiJsonRoute();
    expect(res2.status).toBe(200);
    expect(res2.headers.get('content-type')).toContain('application/json');
    const json2 = await res2.json();
    expect(json2.openapi).toBe('3.0.3');
  });

  it('Scenario 7: Every $ref reference in paths and schemas resolves to an existing component schema', () => {
    const schemas = openApiDocument.components?.schemas || {};
    const refRegex = /^#\/components\/schemas\/(.+)$/;
    const brokenRefs: string[] = [];

    function findRefs(obj: unknown, path: string = '') {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => findRefs(item, `${path}[${idx}]`));
        return;
      }
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (key === '$ref' && typeof val === 'string') {
          const match = val.match(refRegex);
          if (match) {
            const schemaName = match[1];
            if (!schemas[schemaName]) {
              brokenRefs.push(`${path}: $ref '${val}' -> schema '${schemaName}' NOT found`);
            }
          }
        } else {
          findRefs(val, `${path}.${key}`);
        }
      }
    }

    findRefs(openApiDocument.paths, 'paths');
    findRefs(openApiDocument.components?.schemas, 'components.schemas');

    expect(brokenRefs).toEqual([]);
  });

  it('Scenario 8: Path parameter placeholders in URL paths match defined in: path parameters', () => {
    const paths = openApiDocument.paths || {};
    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      const paramMatches = [...pathStr.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
      const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

      for (const method of methods) {
        const op = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined;
        if (!op) continue;
        const opParams = (op.parameters || []) as Array<{ name: string; in: string; required?: boolean }>;
        const pathParams = opParams.filter((p) => p.in === 'path').map((p) => p.name);

        for (const expectedParam of paramMatches) {
          expect(pathParams, `Operation ${method.toUpperCase()} ${pathStr} must document path parameter '${expectedParam}'`).toContain(expectedParam);
        }
      }
    }
  });

  it('Scenario 9: Internal functions and Next.js server actions are not exposed in OpenAPI paths', () => {
    const paths = Object.keys(openApiDocument.paths || {});
    // All paths must begin with /api/ and correspond to valid route.ts files
    for (const p of paths) {
      expect(p.startsWith('/api/')).toBe(true);
      expect(p).not.toContain('action');
    }
  });
});
