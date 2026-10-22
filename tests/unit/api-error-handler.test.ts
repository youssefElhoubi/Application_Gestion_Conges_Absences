import { describe, it, expect } from 'vitest';
import { extractErrorInfo } from '@/src/server/errors/api-error-handler';
import { DomainError, InsufficientLeaveBalanceError } from '@/src/domain/errors/domain-errors';
import { UnauthorizedError, ForbiddenError } from '@/src/modules/auth/auth.guard';

describe('extractErrorInfo', () => {
  it('extracts status and message from base DomainError', () => {
    const error = new DomainError('Base domain constraint failure');
    const result = extractErrorInfo(error);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Base domain constraint failure');
  });

  it('extracts status and message from DomainError subclasses', () => {
    const error = new InsufficientLeaveBalanceError(5, 10);
    const result = extractErrorInfo(error);
    expect(result.statusCode).toBe(422);
    expect(result.message).toContain('Insufficient leave balance');
  });

  it('extracts status code and message from AuthGuard custom errors', () => {
    const unauth = new UnauthorizedError('Session required');
    const resultUnauth = extractErrorInfo(unauth);
    expect(resultUnauth.statusCode).toBe(401);
    expect(resultUnauth.message).toBe('Session required');

    const forbidden = new ForbiddenError('Action denied');
    const resultForbidden = extractErrorInfo(forbidden);
    expect(resultForbidden.statusCode).toBe(403);
    expect(resultForbidden.message).toBe('Action denied');
  });

  it('handles standard Error instances and defaults to 400', () => {
    const error = new Error('Generic failure');
    const result = extractErrorInfo(error);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Generic failure');
  });

  it('allows overriding default status code for generic errors', () => {
    const error = new Error('Internal crash');
    const result = extractErrorInfo(error, 500);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe('Internal crash');
  });

  it('handles string errors', () => {
    const result = extractErrorInfo('Something broke');
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Something broke');
  });

  it('handles unexpected non-error objects gracefully', () => {
    const result = extractErrorInfo(null);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('An unexpected error occurred');

    const result2 = extractErrorInfo(12345);
    expect(result2.statusCode).toBe(400);
    expect(result2.message).toBe('An unexpected error occurred');
  });

  it('extracts code when present on DomainError or object', () => {
    const error = new InsufficientLeaveBalanceError(2, 5);
    const result = extractErrorInfo(error);
    expect(result.code).toBe('INSUFFICIENT_LEAVE_BALANCE');

    const customObj = { message: 'Failed', code: 'CUSTOM_CODE', statusCode: 422 };
    const resultCustom = extractErrorInfo(customObj);
    expect(resultCustom.code).toBe('CUSTOM_CODE');
  });
});
