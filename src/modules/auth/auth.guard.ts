import { Role } from '@/src/generated/prisma';

export interface AuthSession {
  userId: string;
  email: string;
  role: Role;
  employeeId: string | null;
  siteId: number | null;
  managedEmployeeIds: string[];
}

export class UnauthorizedError extends Error {
  readonly statusCode = 401;
  readonly code = 'UNAUTHENTICATED';
  constructor(message = 'Authentication required to access this resource.') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'You do not have the required permissions for this operation.') {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TooManyRequestsError extends Error {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMITED';
  readonly retryAfterSeconds: number;
  constructor(
    message = 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.',
    retryAfterSeconds = 60
  ) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Centralized Authorization Guards
 */
export class AuthGuard {
  /**
   * Enforces that a valid authenticated session exists.
   */
  public static requireAuthenticated(session: AuthSession | null | undefined): AuthSession {
    if (!session || !session.userId) {
      throw new UnauthorizedError();
    }
    return session;
  }

  /**
   * Enforces that the authenticated user possesses one of the authorized roles.
   */
  public static requireRole(session: AuthSession, allowedRoles: Role[]): void {
    this.requireAuthenticated(session);
    if (!allowedRoles.includes(session.role)) {
      throw new ForbiddenError(
        `Role "${session.role}" is not authorized. Required: [${allowedRoles.join(', ')}]`
      );
    }
  }

  /**
   * Enforces employee record access scope:
   * - ADMIN & HR_MANAGER: Can access any employee
   * - SUPERVISOR: Can access themselves or subordinates in their reporting line
   * - EMPLOYEE: Can strictly access only their own record
   */
  public static canAccessEmployee(session: AuthSession, targetEmployeeId: string): boolean {
    this.requireAuthenticated(session);

    if (session.role === 'ADMIN' || session.role === 'HR_MANAGER') {
      return true;
    }

    if (session.employeeId === targetEmployeeId) {
      return true;
    }

    if (session.role === 'SUPERVISOR' && session.managedEmployeeIds.includes(targetEmployeeId)) {
      return true;
    }

    return false;
  }

  public static requireAccessEmployee(session: AuthSession, targetEmployeeId: string): void {
    if (!this.canAccessEmployee(session, targetEmployeeId)) {
      throw new ForbiddenError(
        `Access denied: You do not have permission to view or manage employee "${targetEmployeeId}".`
      );
    }
  }

  /**
   * Enforces absence approval and review permissions:
   * - ADMIN & HR_MANAGER: Can review all requests (except self-approval if employee)
   * - SUPERVISOR: Can review requests for their reporting subordinates
   * - EMPLOYEE: Cannot review any requests
   * - Universal Invariant: Self-approval is strictly forbidden across all roles
   */
  public static canReviewAbsence(
    session: AuthSession,
    requestApplicantEmployeeId: string,
    requestApplicantSiteId?: number
  ): boolean {
    this.requireAuthenticated(session);

    // Self-approval prohibition rule
    if (session.employeeId && session.employeeId === requestApplicantEmployeeId) {
      return false;
    }

    if (session.role === 'ADMIN' || session.role === 'HR_MANAGER') {
      return true;
    }

    if (session.role === 'SUPERVISOR') {
      return session.managedEmployeeIds.includes(requestApplicantEmployeeId);
    }

    return false;
  }

  public static requireCanReviewAbsence(
    session: AuthSession,
    requestApplicantEmployeeId: string
  ): void {
    this.requireAuthenticated(session);

    if (session.employeeId && session.employeeId === requestApplicantEmployeeId) {
      throw new ForbiddenError('Self-approval violation: An approver cannot approve or reject their own leave request.');
    }

    if (!this.canReviewAbsence(session, requestApplicantEmployeeId)) {
      throw new ForbiddenError(
        `Review permission denied: You are not authorized to review leave requests for employee "${requestApplicantEmployeeId}".`
      );
    }
  }
}
