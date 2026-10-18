import { OpenAPIV3_1 } from 'openapi-types';

export const authPaths: OpenAPIV3_1.PathsObject = {
  '/api/auth/login': {
    post: {
      tags: ['Authentication & Sessions'],
      summary: 'Authenticate with email and password',
      description: `Authenticates a user using email and password.
- Verifies password hash using Argon2id with OWASP parameters (19 MiB memory, 2 iterations).
- On success, creates a persistent database session in a new token family.
- Issues a 15-minute signed JWT access token in response body and sets secure HttpOnly cookies:
  - \`access_token\` (HttpOnly, SameSite=Lax, Path=/, Max-Age=900s)
  - \`refresh_token\` (HttpOnly, SameSite=Strict, Path=/api/auth, Max-Age=7d)
- Protected by rate limiting: max 5 failed attempts per 15 minutes per IP/email.`,
      security: [], // Public endpoint
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful. Returns access token, sanitized user profile, and sets secure HttpOnly cookies.',
          headers: {
            'Set-Cookie': {
              description: 'Sets HttpOnly access_token and refresh_token cookies.',
              schema: { type: 'string' },
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
            },
          },
        },
        '400': {
          description: 'Invalid JSON body or missing required credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        '401': {
          description: 'Invalid credentials or inactive user account',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '403': {
          description: 'Account suspended or access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '429': {
          description: 'Rate limit exceeded. Too many failed login attempts.',
          headers: {
            'Retry-After': {
              description: 'Seconds to wait before retrying authentication.',
              schema: { type: 'integer' },
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '500': {
          description: 'Internal server error during authentication',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/auth/refresh': {
    post: {
      tags: ['Authentication & Sessions'],
      summary: 'Rotate refresh token and issue new access token',
      description: `Performs atomic Refresh Token Rotation (RTR).
- Reads the refresh token primarily from the secure HttpOnly \`refresh_token\` cookie (with optional fallback to request body).
- Validates the token against the persistent database session state, checking both absolute expiration (7 days) and idle inactivity (24 hours).
- **Token Reuse Detection**: If an already-rotated or revoked token is reused (indicating a potential replay attack or credential theft), the system automatically revokes all sessions belonging to the entire token family.
- Rotates the refresh token atomically, updating the stored SHA-256 hash.
- Issues a new 15-minute access token and updates the HttpOnly cookies.`,
      security: [
        { RefreshTokenCookie: [] },
        { CookieAuth: [] },
      ],
      requestBody: {
        required: false,
        description: 'Optional body fallback for environments where HttpOnly cookies cannot be sent automatically.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshTokenInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Token successfully rotated. Returns new access token and rotated refresh cookies.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
            },
          },
        },
        '401': {
          description: 'Missing, expired, or invalid refresh token. Existing cookies are cleared.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '403': {
          description: 'Token reuse detected or account deactivated. All family sessions revoked.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '500': {
          description: 'Internal server error during token refresh',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/auth/logout': {
    post: {
      tags: ['Authentication & Sessions'],
      summary: 'Revoke active session and clear authentication cookies',
      description: `Gracefully terminates the user session:
- Revokes the stored refresh token hash and database session record.
- Clears the \`access_token\` and \`refresh_token\` HttpOnly cookies by setting \`maxAge: 0\` and an expired timestamp.
- Ensures immediate invalidation of token renewal, preventing further access token refreshes.
- Designed to succeed idempotently even if the session was already expired.`,
      security: [
        { BearerAuth: [] },
        { CookieAuth: [] },
      ],
      responses: {
        '200': {
          description: 'Successfully logged out and session revoked.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LogoutSuccessResponse' },
            },
          },
        },
      },
    },
  },

  '/api/auth/me': {
    get: {
      tags: ['Authentication & Sessions'],
      summary: 'Get verified authenticated user identity and authorization scope',
      description: `Returns the authenticated user account and their real-time authorization boundaries.
- Derived strictly from cryptographically verified JWT claims and real-time database state.
- Returns account status, assigned role, linked employee matricule, site ID, and direct subordinate employee IDs for supervisor scoping.
- Access restricted to authenticated users.`,
      security: [
        { BearerAuth: [] },
        { CookieAuth: [] },
        { ApiKeyAuth: [] },
      ],
      responses: {
        '200': {
          description: 'Authenticated user profile and authorization scopes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthMeResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated or invalid session',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/auth/sessions': {
    get: {
      tags: ['Authentication & Sessions'],
      summary: 'List user authentication sessions',
      description: `Returns active and past authentication sessions for auditing device access.
- Safe audit fields: creation date, last active timestamp, expiration date, user agent, IP address, and revocation status.
- Never exposes raw refresh tokens or token hashes.
- Regular users can only inspect their own sessions.
- Users with \`ADMIN\` or \`HR_MANAGER\` roles can inspect any target user by passing \`?userId=<target-id>\`.`,
      security: [
        { BearerAuth: [] },
        { CookieAuth: [] },
      ],
      parameters: [
        {
          name: 'userId',
          in: 'query',
          schema: { type: 'string' },
          required: false,
          description: 'Target user ID to inspect (requires ADMIN or HR_MANAGER role if different from caller).',
        },
      ],
      responses: {
        '200': {
          description: 'List of user sessions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserSessionsResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '403': {
          description: 'Forbidden: Insufficient privileges to view sessions of another user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Authentication & Sessions'],
      summary: 'Revoke one or all user sessions',
      description: `Revokes active sessions server-side:
- Pass \`sessionId\` to revoke a specific device session.
- Pass \`all: true\` to revoke all active sessions for the user.
- Regular users can only revoke their own sessions.
- Users with \`ADMIN\` or \`HR_MANAGER\` roles can revoke sessions of any target user by specifying \`userId\`.`,
      security: [
        { BearerAuth: [] },
        { CookieAuth: [] },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RevokeSessionInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Session(s) successfully revoked',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RevokeSessionSuccessResponse' },
            },
          },
        },
        '400': {
          description: 'Invalid input parameters (must provide sessionId or all: true)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '401': {
          description: 'Unauthenticated session',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '403': {
          description: 'Forbidden: Insufficient privileges to revoke sessions of another user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '404': {
          description: 'Session not found or already revoked',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },
};
