type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  environment: string;
}

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

class Logger {
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
      environment: this.environment,
    };
  }

  private formatContext(context: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return "";
    }

    // 特別な処理が必要なフィールド
    const specialFields = ["metrics", "error", "stats"];
    const entries: string[] = [];

    Object.entries(context).forEach(([key, value]) => {
      if (specialFields.includes(key) && typeof value === "object") {
        // ネストされたオブジェクトを読みやすくフォーマット
        const formatted = this.formatNestedObject(
          value as Record<string, unknown>,
          1,
        );
        entries.push(`${key}=${formatted}`);
      } else if (typeof value === "object" && value !== null) {
        // 通常のオブジェクトは簡潔に表示
        entries.push(`${key}=${JSON.stringify(value)}`);
      } else {
        entries.push(`${key}=${String(value)}`);
      }
    });

    return entries.length > 0 ? `| ${entries.join(" | ")}` : "";
  }

  private formatNestedObject(
    obj: Record<string, unknown>,
    depth: number,
  ): string {
    if (depth > 3) return JSON.stringify(obj); // 深すぎる場合はJSONに戻す

    const entries: string[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const nested = this.formatNestedObject(
          value as Record<string, unknown>,
          depth + 1,
        );
        entries.push(`${key}:{${nested}}`);
      } else if (Array.isArray(value)) {
        entries.push(`${key}:[${value.join(",")}]`);
      } else {
        entries.push(`${key}:${String(value)}`);
      }
    });

    return entries.join(" ");
  }

  private output(logEntry: LogEntry): void {
    // 環境に関わらず統一された読みやすい形式を使用
    const timestamp = new Date(logEntry.timestamp)
      .toISOString()
      .replace("T", " ")
      .slice(0, -5);
    const level = logEntry.level.toUpperCase().padEnd(5);
    const contextStr = logEntry.context
      ? this.formatContext(logEntry.context)
      : "";

    console.log(`[${timestamp}] [${level}] ${logEntry.message}${contextStr}`);
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
