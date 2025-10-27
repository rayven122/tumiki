/**
 * ログレベル
 */
type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * ログメタデータ
 */
type LogMetadata = Record<string, unknown>;

/**
 * MCP Logger
 *
 * 構造化ログ出力とCloud Logging連携
 * Cloud Run ステートレス環境に最適化
 */
export class McpLogger {
  private readonly isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * エラーログ
   */
  logError(
    namespace: string,
    method: string,
    error: Error,
    metadata?: LogMetadata,
  ): void {
    this.log("error", error.message, {
      namespace,
      method,
      stack: error.stack,
      ...metadata,
    });
  }

  /**
   * 情報ログ
   */
  logInfo(message: string, metadata?: LogMetadata): void {
    this.log("info", message, metadata);
  }

  /**
   * 警告ログ
   */
  logWarn(message: string, metadata?: LogMetadata): void {
    this.log("warn", message, metadata);
  }

  /**
   * デバッグログ
   */
  logDebug(message: string, metadata?: LogMetadata): void {
    if (this.isDevelopment || process.env.LOG_LEVEL === "debug") {
      this.log("debug", message, metadata);
    }
  }

  /**
   * ログ出力
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    if (this.isDevelopment) {
      // 開発環境: 読みやすい形式
      const emoji = this.getLevelEmoji(level);
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`, metadata);
    } else {
      // 本番環境: JSON形式
      console.log(JSON.stringify(logData));
    }
  }

  /**
   * ログレベルに応じた絵文字を取得
   */
  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
      case "error":
        return "❌";
      case "debug":
        return "🔍";
      default:
        return "📝";
    }
  }
}
