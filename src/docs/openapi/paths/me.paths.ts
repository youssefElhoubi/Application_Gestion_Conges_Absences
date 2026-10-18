import { OpenAPIV3_1 } from 'openapi-types';

export const mePaths: OpenAPIV3_1.PathsObject = {
  '/api/me': {
    get: {
      tags: ['Current User'],
      summary: 'Get current authenticated user & employee portal bootstrap',
      description: 'Returns the authenticated user account, associated employee record, real-time balances, upcoming approved leaves, upcoming public holidays, and active recovery credits.',
      responses: {
        '200': {
          description: 'Current user profile and portal data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CurrentUserResponse' },
            },
          },
        },
        '400': {
          description: 'Failed to retrieve user context',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        '401': {
          description: 'Unauthenticated session',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
    },
  },
};
