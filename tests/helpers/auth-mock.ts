import { AuthSession } from '@/src/modules/auth/auth.guard';

export function createMockSession(role: 'ADMIN' | 'HR_MANAGER' | 'SUPERVISOR' | 'EMPLOYEE', overrides: Partial<AuthSession> = {}): AuthSession {
  switch (role) {
    case 'ADMIN':
      return {
        userId: 'admin-user-id',
        email: 'admin@company.ma',
        role: 'ADMIN',
        employeeId: null,
        siteId: null,
        managedEmployeeIds: [],
        ...overrides,
      };
    case 'HR_MANAGER':
      return {
        userId: 'hr-user-id',
        email: 'hr@company.ma',
        role: 'HR_MANAGER',
        employeeId: 'EMP-HR',
        siteId: 1,
        managedEmployeeIds: [],
        ...overrides,
      };
    case 'SUPERVISOR':
      return {
        userId: 'sup-user-id',
        email: 'supervisor@company.ma',
        role: 'SUPERVISOR',
        employeeId: 'EMP-SUP',
        siteId: 1,
        managedEmployeeIds: ['EMP-SUB-1', 'EMP-SUB-2'],
        ...overrides,
      };
    case 'EMPLOYEE':
      return {
        userId: 'emp-user-id',
        email: 'employee@company.ma',
        role: 'EMPLOYEE',
        employeeId: 'EMP-001',
        siteId: 1,
        managedEmployeeIds: [],
        ...overrides,
      };
  }
}
