type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  service: string;
  environment: string;
}

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

class Logger {
  private readonly service = "proxy-server";
  private readonly environment = process.env.NODE_ENV || "development";
  private readonly logLevel = process.env.LOG_LEVEL || "info";

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    const currentLevelIndex = levels.indexOf(this.logLevel as LogLevel);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex <= currentLevelIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.service,
      environment: this.environment,
    };
  }

  private output(logEntry: LogEntry): void {
    if (this.environment === "production") {
      console.log(JSON.stringify(logEntry));
    } else {
      // Development環境では読みやすい形式で出力
      const contextStr = logEntry.context
        ? ` ${JSON.stringify(logEntry.context)}`
        : "";
      console.log(
        `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}${contextStr}`,
      );
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.createLogEntry(LogLevel.ERROR, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.createLogEntry(LogLevel.WARN, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.createLogEntry(LogLevel.INFO, message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.createLogEntry(LogLevel.DEBUG, message, context));
    }
  }
}

export const logger = new Logger();
