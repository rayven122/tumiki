export class CalendarError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

export class AuthenticationError extends CalendarError {
  constructor(message: string) {
    super(message, "AUTH_ERROR");
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends CalendarError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class ApiError extends CalendarError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly statusText?: string,
  ) {
    super(message, "API_ERROR");
    this.name = "ApiError";
  }
}

export class CalendarNotFoundError extends CalendarError {
  constructor(calendarId: string) {
    super(`Calendar not found: ${calendarId}`, "CALENDAR_NOT_FOUND");
    this.name = "CalendarNotFoundError";
  }
}

export class EventNotFoundError extends CalendarError {
  constructor(eventId: string, calendarId?: string) {
    super(
      `Event not found: ${eventId}${calendarId ? ` in calendar ${calendarId}` : ""}`,
      "EVENT_NOT_FOUND",
    );
    this.name = "EventNotFoundError";
  }
}

export class PermissionDeniedError extends CalendarError {
  constructor(message: string) {
    super(message, "PERMISSION_DENIED");
    this.name = "PermissionDeniedError";
  }
}

export class QuotaExceededError extends CalendarError {
  constructor(message: string) {
    super(message, "QUOTA_EXCEEDED");
    this.name = "QuotaExceededError";
  }
}
