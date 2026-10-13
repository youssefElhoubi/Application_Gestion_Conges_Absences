export class DomainError extends Error {
  readonly code: string = 'DOMAIN_RULE_VIOLATION';
  readonly statusCode: number = 400;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SeniorityThresholdNotMetError extends DomainError {
  readonly code = 'SENIORITY_THRESHOLD_NOT_MET';
  readonly statusCode = 422;

  constructor(serviceMonths: number, requiredMonths = 6) {
    super(
      `Under Moroccan Labor Law (Art. 231), annual paid leave entitlement requires at least ${requiredMonths} months of continuous service. Current seniority: ${serviceMonths} month(s).`,
      { serviceMonths, requiredMonths }
    );
  }
}

export class InsufficientLeaveBalanceError extends DomainError {
  readonly code = 'INSUFFICIENT_LEAVE_BALANCE';
  readonly statusCode = 422;

  constructor(availableDays: number, requestedDays: number) {
    super(
      `Insufficient leave balance. Available: ${availableDays.toFixed(2)} day(s), Requested: ${requestedDays.toFixed(2)} day(s).`,
      { availableDays, requestedDays }
    );
  }
}

export class ExceptionalPermissionQuotaExceededError extends DomainError {
  readonly code = 'EXCEPTIONAL_PERMISSION_QUOTA_EXCEEDED';
  readonly statusCode = 422;

  constructor(reasonCode: string, allowedDays: number, requestedDays: number) {
    super(
      `Statutory quota exceeded for exceptional leave "${reasonCode}". Statutory allowance: ${allowedDays} day(s), Requested: ${requestedDays} day(s).`,
      { reasonCode, allowedDays, requestedDays }
    );
  }
}

export class OverlappingAbsenceError extends DomainError {
  readonly code = 'OVERLAPPING_ABSENCE';
  readonly statusCode = 409;

  constructor(startDate: Date, endDate: Date) {
    super(
      `An existing approved or pending absence overlaps with the requested range (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}).`,
      { startDate, endDate }
    );
  }
}

export class ZeroWorkingDaysError extends DomainError {
  readonly code = 'ZERO_WORKING_DAYS';
  readonly statusCode = 400;

  constructor() {
    super('The requested absence period contains 0 deductible working days (all dates fall on weekly rest days or public holidays).');
  }
}

export class InactiveEmployeeError extends DomainError {
  readonly code = 'INACTIVE_EMPLOYEE';
  readonly statusCode = 403;

  constructor(employeeId: string) {
    super(`Employee "${employeeId}" is inactive. Leave requests cannot be created or modified for inactive staff.`, { employeeId });
  }
}

export class RecoveryCreditDepletedError extends DomainError {
  readonly code = 'RECOVERY_CREDIT_DEPLETED';
  readonly statusCode = 422;

  constructor(availableCreditDays: number, requestedDays: number) {
    super(
      `Insufficient recovery leave credits. Available recovery credit balance: ${availableCreditDays.toFixed(2)} day(s), Requested: ${requestedDays.toFixed(2)} day(s).`,
      { availableCreditDays, requestedDays }
    );
  }
}

export class HolidayAlreadyCreditedError extends DomainError {
  readonly code = 'HOLIDAY_ALREADY_CREDITED';
  readonly statusCode = 409;

  constructor(employeeId: string, holidayId: string) {
    super(`Recovery credit for public holiday ${holidayId} has already been granted to employee ${employeeId}.`, {
      employeeId,
      holidayId,
    });
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  readonly statusCode = 400;

  constructor(currentStatus: string, attemptedAction: string) {
    super(`Cannot execute "${attemptedAction}" on an absence with status "${currentStatus}".`, {
      currentStatus,
      attemptedAction,
    });
  }
}
