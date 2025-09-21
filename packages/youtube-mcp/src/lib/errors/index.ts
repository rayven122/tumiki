export type { Result, Success, Failure } from "@/lib/result.js";
export { ok, err, isOk, isErr, mapResult } from "@/lib/result.js";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}
