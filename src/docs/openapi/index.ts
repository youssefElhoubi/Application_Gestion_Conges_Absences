import { OpenAPIV3 } from 'openapi-types';
import { openapiConfig } from './openapi.config';
import { commonSchemas } from './schemas/common.schemas';
import { authSchemas } from './schemas/auth.schemas';
import { absenceSchemas } from './schemas/absence.schemas';
import { employeeSchemas } from './schemas/employee.schemas';
import { counterSchemas } from './schemas/counter.schemas';
import { holidaySchemas } from './schemas/holiday.schemas';
import { dashboardSchemas } from './schemas/dashboard.schemas';
import { ruleSchemas } from './schemas/rule.schemas';
import { siteSchemas } from './schemas/site.schemas';
import { meSchemas } from './schemas/me.schemas';

import { authPaths } from './paths/auth.paths';
import { absencesPaths } from './paths/absences.paths';
import { employeesPaths } from './paths/employees.paths';
import { countersPaths } from './paths/counters.paths';
import { dashboardPaths } from './paths/dashboard.paths';
import { holidaysPaths } from './paths/holidays.paths';
import { creditsPaths } from './paths/credits.paths';
import { rulesPaths } from './paths/rules.paths';
import { sitesPaths } from './paths/sites.paths';
import { mePaths } from './paths/me.paths';

export const openApiDocument: OpenAPIV3.Document = {
  ...openapiConfig,
  security: [
    { BearerAuth: [] },
    { CookieAuth: [] },
    { ApiKeyAuth: [] },
  ],
  paths: {
    ...authPaths,
    ...absencesPaths,
    ...employeesPaths,
    ...countersPaths,
    ...dashboardPaths,
    ...holidaysPaths,
    ...creditsPaths,
    ...rulesPaths,
    ...sitesPaths,
    ...mePaths,
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard HTTP Bearer authorization using a short-lived (15 minutes) signed JWT access token. Obtained from /api/auth/login or /api/auth/refresh.',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'HttpOnly session cookie carrying the JWT access token (Path=/; HttpOnly; SameSite=Lax; Secure in production). Used automatically by browsers for same-origin API requests.',
      },
      RefreshTokenCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'Dedicated secure HttpOnly refresh token cookie (Path=/api/auth; HttpOnly; SameSite=Strict; Secure in production). Used exclusively by /api/auth/refresh and /api/auth/logout for atomic Refresh Token Rotation (RTR).',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'Primary testing and automation header for development and non-production environments. Accepts an active system User ID (e.g. "usr-admin-default").',
      },
    },
    schemas: {
      ...commonSchemas,
      ...authSchemas,
      ...absenceSchemas,
      ...employeeSchemas,
      ...counterSchemas,
      ...holidaySchemas,
      ...dashboardSchemas,
      ...ruleSchemas,
      ...siteSchemas,
      ...meSchemas,
    },
  },
};
