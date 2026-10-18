import { OpenAPIV3 } from 'openapi-types';

export const openapiConfig: Omit<OpenAPIV3.Document, 'paths' | 'components'> = {
  openapi: '3.0.3',
  info: {
    title: 'Leave & Absence Management API',
    description: `Enterprise REST API for statutory leave management, paid leave dynamic accruals, working days calculation under Moroccan Labor Law (Code du Travail - Law 65-99), worked public holiday recovery credits, and role-based approval workflows.

### Authentication & Authorization Architecture:
- **Credentials & Password Hashing**: User authentication via unique normalized email addresses and passwords securely hashed with Argon2id conforming to RFC 9106 and OWASP guidelines (19 MiB memory cost, 2 iterations, 1 lane).
- **Bearer JWT Access Tokens (\`BearerAuth\`)**: Short-lived (15 minutes) cryptographically signed tokens containing user identity, active role, linked employee ID, and assigned site ID. Transmitted via \`Authorization: Bearer <token>\`.
- **HttpOnly Cookie Transport**:
  - \`access_token\`: HttpOnly cookie scoped to \`Path=/\`, \`SameSite=Lax\`, with 15-minute expiration.
  - \`refresh_token\`: Secure HttpOnly cookie scoped to \`Path=/api/auth\`, \`SameSite=Strict\`, with 7-day absolute lifetime and 24-hour idle timeout.
- **Refresh Token Rotation (RTR) & Reuse Detection**: Refresh tokens are rotated atomically on every \`/api/auth/refresh\` call. If an already-rotated token is reused, the entire token family is immediately revoked to neutralize replay attacks.
- **Persistent Server-Side Sessions**: Database sessions track device User-Agent, client IP, active token family, and revocation status. Sessions can be audited or revoked individually or globally via \`/api/auth/sessions\`.
- **Role-Based Access Control (RBAC)**: Enforced via server-side guards:
  - \`ADMIN\`: Full administrative and system configuration privileges.
  - \`HR_MANAGER\`: Organization-wide leave management, employee registration, and balance administration.
  - \`SUPERVISOR\`: Team-level approvals and subordinate employee record access.
  - \`EMPLOYEE\`: Self-service leave requests, personal balances, and schedule visibility.
- **IDOR Prevention**: Server-side guards strictly restrict access so employees cannot inspect or modify other employees' records.
- **Universal Invariant**: Approvers can **never** self-approve or self-reject their own leave requests across any role.
- **Test Automation Header (\`x-user-id\`)**: Developer and testing header accepted in non-production automated test environments.`,
    version: '0.1.0',
    contact: {
      name: 'HR Systems & Engineering Team',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Next.js Application Server (Relative)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    {
      name: 'Authentication & Sessions',
      description: 'User login, token refresh rotation, session inspection, logout, and credential lifecycle management.',
    },
    {
      name: 'Absences',
      description: 'Leave request submission, review workflow (approve, reject, cancel), and statutory calculation preview.',
    },
    {
      name: 'Employees',
      description: 'Employee directory, seniority computation, statutory eligibility flags, and leave balances.',
    },
    {
      name: 'Counters',
      description: 'Dynamic leave counters, accrual ledger tracking, and multi-employee balance overview.',
    },
    {
      name: 'Dashboard',
      description: 'High-performance operational metrics, category distributions, and analytics summary.',
    },
    {
      name: 'Public Holidays',
      description: 'Statutory public holiday calendar management and credit association.',
    },
    {
      name: 'Holiday Work Credits',
      description: 'Recovery credit allocation, corrections, and FIFO consumption ledger.',
    },
    {
      name: 'Leave Rules',
      description: 'Configurable Moroccan labor law parameters, accrual steps, and caps.',
    },
    {
      name: 'Sites',
      description: 'Operational work sites, timezones, and weekly rest day configurations.',
    },
    {
      name: 'Current User',
      description: 'Authenticated user profile, linked employee identity, and personal schedules.',
    },
  ],
};
