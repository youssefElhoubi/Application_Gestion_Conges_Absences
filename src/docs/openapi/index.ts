import { OpenAPIV3 } from 'openapi-types';
import { openapiConfig } from './openapi.config';
import { commonSchemas } from './schemas/common.schemas';
import { absenceSchemas } from './schemas/absence.schemas';
import { employeeSchemas } from './schemas/employee.schemas';
import { counterSchemas } from './schemas/counter.schemas';
import { holidaySchemas } from './schemas/holiday.schemas';
import { dashboardSchemas } from './schemas/dashboard.schemas';
import { ruleSchemas } from './schemas/rule.schemas';
import { siteSchemas } from './schemas/site.schemas';
import { meSchemas } from './schemas/me.schemas';

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
    { ApiKeyAuth: [] },
    { BearerAuth: [] },
  ],
  paths: {
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
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'Primary testing and automation header. Accepts an active system User ID (e.g. "usr-admin-default").',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT / SessionToken',
        description: 'Standard HTTP Bearer authorization token.',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session_token',
        description: 'HTTP Session cookie (auth_user_id or session_token).',
      },
    },
    schemas: {
      ...commonSchemas,
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
