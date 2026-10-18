import { OpenAPIV3 } from 'openapi-types';

export const openapiConfig: Omit<OpenAPIV3.Document, 'paths' | 'components'> = {
  openapi: '3.0.3',
  info: {
    title: 'Leave & Absence Management API',
    description: `Enterprise REST API for statutory leave management, paid leave dynamic accruals, working days calculation under Moroccan Labor Law (Code du Travail - Law 65-99), worked public holiday recovery credits, and role-based approval workflows.

### Authentication & Authorization Mechanisms:
- **Direct User Header (\`x-user-id\`)**: Used for automated clients, developer tooling, and testing. Pass a valid user ID (e.g. \`usr-admin-default\`).
- **Bearer Token (\`Authorization\`)**: Accepts \`Bearer <user-id-or-token>\`.
- **Session Cookies**: Automatically resolves \`auth_user_id\` or \`session_token\`.
- **Role Scoping**: Access is controlled by roles: \`ADMIN\`, \`HR_MANAGER\`, \`SUPERVISOR\`, \`EMPLOYEE\`.
- **Universal Invariant**: Approvers can **never** self-approve or self-reject their own leave requests.`,
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
