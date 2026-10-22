import { DomainError } from '@/src/domain/errors/domain-errors';

export interface ErrorInfo {
  statusCode: number;
  message: string;
  code?: string;
}

/**
 * Extracts a normalized HTTP status code and user-facing error message
 * from an unknown caught error without using unsafe `any` assertions.
 */
export function extractErrorInfo(error: unknown, defaultStatusCode = 400): ErrorInfo {
  if (error instanceof DomainError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { statusCode?: unknown; message?: unknown; code?: unknown };
    const statusCode =
      typeof candidate.statusCode === 'number' && Number.isInteger(candidate.statusCode)
        ? candidate.statusCode
        : defaultStatusCode;
    const message =
      typeof candidate.message === 'string' && candidate.message.trim().length > 0
        ? candidate.message
        : 'An error occurred';
    const code =
      typeof candidate.code === 'string' && candidate.code.trim().length > 0
        ? candidate.code
        : undefined;
    return { statusCode, message, code };
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return { statusCode: defaultStatusCode, message: error };
  }

  return { statusCode: defaultStatusCode, message: 'An unexpected error occurred' };
}
