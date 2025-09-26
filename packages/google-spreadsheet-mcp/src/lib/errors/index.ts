export class GoogleSheetsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "GoogleSheetsApiError";
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export const isGoogleSheetsApiError = (
  error: unknown,
): error is GoogleSheetsApiError => error instanceof GoogleSheetsApiError;

export const isAuthenticationError = (
  error: unknown,
): error is AuthenticationError => error instanceof AuthenticationError;

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;
