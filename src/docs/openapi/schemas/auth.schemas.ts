import { OpenAPIV3 } from 'openapi-types';

export const authSchemas: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject> = {
  LoginInput: {
    type: 'object',
    description: 'Email and password credentials for user authentication.',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'Normalized corporate email address.',
        example: 'admin@entreprise.ma',
        maxLength: 150,
      },
      password: {
        type: 'string',
        format: 'password',
        description: 'Plaintext password (verified against Argon2id hash).',
        example: 'Password123#Secure',
        minLength: 1,
        maxLength: 128,
      },
    },
    required: ['email', 'password'],
  },

  RefreshTokenInput: {
    type: 'object',
    description: 'Optional payload for token refresh when HttpOnly cookie is unavailable.',
    properties: {
      refreshToken: {
        type: 'string',
        description: 'Opaque 64-character hexadecimal refresh token.',
        example: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      },
    },
  },

  SafeUserProfile: {
    type: 'object',
    description: 'Sanitized public user account identity. Never leaks password hashes or security secrets.',
    properties: {
      id: {
        type: 'string',
        description: 'Unique system user identifier.',
        example: 'usr-admin-default',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Verified account email address.',
        example: 'admin@entreprise.ma',
      },
      role: {
        $ref: '#/components/schemas/RoleEnum',
      },
      employeeId: {
        type: 'string',
        nullable: true,
        description: 'Associated employee matricule, or null for non-employee administrators.',
        example: 'EMP-00101',
      },
    },
    required: ['id', 'email', 'role'],
  },

  AuthSuccessResponse: {
    type: 'object',
    description: 'Successful authentication payload issuing a short-lived access token and sanitized user profile.',
    properties: {
      user: {
        $ref: '#/components/schemas/SafeUserProfile',
      },
      accessToken: {
        type: 'string',
        description: 'Signed HMAC-SHA256 JWT access token valid for 15 minutes.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3ItYWRtaW4tZGVmYXVsdCIsImVtYWlsIjoiYWRtaW5AZW50cmVwcmlzZS5tYSIsInJvbGUiOiJBRE1JTiIsImVtcGxveWVlSWQiOm51bGwsImlhdCI6MTc2MDgwODAwMCwiZXhwIjoxNzYwODA4OTAwfQ.sample_signature',
      },
    },
    required: ['user', 'accessToken'],
  },

  AuthMeUser: {
    type: 'object',
    description: 'Verified user identity with detailed organizational and supervisor hierarchy scope.',
    properties: {
      id: {
        type: 'string',
        description: 'Unique user identifier.',
        example: 'usr-mgr-01',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Verified corporate email address.',
        example: 'manager@entreprise.ma',
      },
      role: {
        $ref: '#/components/schemas/RoleEnum',
      },
      employeeId: {
        type: 'string',
        nullable: true,
        description: 'Associated employee record matricule.',
        example: 'EMP-MGR-01',
      },
      siteId: {
        type: 'integer',
        nullable: true,
        description: 'Assigned corporate site identifier.',
        example: 1,
      },
      managedEmployeeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of employee matricules directly supervised by this user (empty for non-supervisors).',
        example: ['EMP-00101', 'EMP-00102'],
      },
    },
    required: ['id', 'email', 'role', 'managedEmployeeIds'],
  },

  AuthMeResponse: {
    type: 'object',
    description: 'Current verified session context and permission boundaries.',
    properties: {
      user: {
        $ref: '#/components/schemas/AuthMeUser',
      },
    },
    required: ['user'],
  },

  SafeSessionItem: {
    type: 'object',
    description: 'Audit record of an authentication session. Never exposes raw tokens or token hashes.',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique session identifier.',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      },
      userId: {
        type: 'string',
        description: 'Associated user account identifier.',
        example: 'usr-admin-default',
      },
      familyId: {
        type: 'string',
        format: 'uuid',
        description: 'Refresh token lineage family identifier used for reuse detection.',
        example: 'a123b456-c789-012d-ef34-567890abcdef',
      },
      userAgent: {
        type: 'string',
        nullable: true,
        description: 'Client browser or device User-Agent header at creation.',
        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      ipAddress: {
        type: 'string',
        nullable: true,
        description: 'Client network IP address at session creation.',
        example: '192.168.1.100',
      },
      isRevoked: {
        type: 'boolean',
        description: 'True if session has been revoked by user logout, admin action, or token reuse detection.',
        example: false,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp when session was initiated.',
        example: '2026-10-18T10:00:00.000Z',
      },
      lastActiveAt: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp of the most recent token refresh or activity.',
        example: '2026-10-18T12:30:00.000Z',
      },
      expiresAt: {
        type: 'string',
        format: 'date-time',
        description: 'Absolute expiration date of the refresh token.',
        example: '2026-10-25T10:00:00.000Z',
      },
      isCurrent: {
        type: 'boolean',
        description: 'True if this session corresponds to the currently authenticated request.',
        example: true,
      },
    },
    required: ['id', 'userId', 'familyId', 'isRevoked', 'createdAt', 'lastActiveAt', 'expiresAt', 'isCurrent'],
  },

  UserSessionsResponse: {
    type: 'object',
    description: 'List of active and historical authentication sessions for a user.',
    properties: {
      sessions: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/SafeSessionItem',
        },
      },
    },
    required: ['sessions'],
  },

  RevokeSessionInput: {
    type: 'object',
    description: 'Parameters for revoking active sessions. Specify either a sessionId or set all: true.',
    properties: {
      sessionId: {
        type: 'string',
        format: 'uuid',
        description: 'Unique session identifier to revoke.',
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      },
      all: {
        type: 'boolean',
        description: 'If true, revokes all active sessions for the user.',
        example: true,
      },
      userId: {
        type: 'string',
        description: 'Target user ID whose sessions should be revoked (restricted to ADMIN and HR_MANAGER).',
        example: 'usr-employee-01',
      },
    },
  },

  RevokeSessionSuccessResponse: {
    type: 'object',
    description: 'Acknowledgment of successful session revocation.',
    properties: {
      message: {
        type: 'string',
        description: 'Human-readable confirmation message.',
        example: 'Session révoquée avec succès.',
      },
    },
    required: ['message'],
  },

  LogoutSuccessResponse: {
    type: 'object',
    description: 'Acknowledgment of successful logout and cookie clearance.',
    properties: {
      message: {
        type: 'string',
        description: 'Human-readable confirmation message.',
        example: 'Déconnexion réussie.',
      },
    },
    required: ['message'],
  },
};
