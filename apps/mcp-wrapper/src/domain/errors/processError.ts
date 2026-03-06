import { DomainError } from "./domainError.js";

/**
 * プロセス起動エラー
 */
export class ProcessStartError extends DomainError {
  readonly code = "PROCESS_START_ERROR";

  constructor(serverName: string, cause: string) {
    super(`Failed to start process for ${serverName}: ${cause}`);
  }
}

/**
 * プロセスタイムアウトエラー
 */
export class ProcessTimeoutError extends DomainError {
  readonly code = "PROCESS_TIMEOUT";

  constructor(serverName: string) {
    super(`Request timeout for ${serverName}`);
  }
}

/**
 * プロセス未起動エラー
 */
export class ProcessNotRunningError extends DomainError {
  readonly code = "PROCESS_NOT_RUNNING";

  constructor(serverName: string) {
    super(`Process not running for ${serverName}`);
  }
}
