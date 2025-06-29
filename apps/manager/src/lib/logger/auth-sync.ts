/**
 * Auth0 User Synchronization Logger
 *
 * ユーザー同期に関する詳細なログとメトリクスを管理
 */

interface SyncLogEntry {
  timestamp: string;
  userId: string;
  source: "post-login-action" | "fallback-sync";
  status: "success" | "error" | "retry";
  duration?: number;
  error?: string;
  userInfo?: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
}

class AuthSyncLogger {
  private static instance: AuthSyncLogger;
  private logEntries: SyncLogEntry[] = [];
  private maxLogEntries = 1000; // メモリ使用量制限

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): AuthSyncLogger {
    if (!AuthSyncLogger.instance) {
      AuthSyncLogger.instance = new AuthSyncLogger();
    }
    return AuthSyncLogger.instance;
  }

  logSync(entry: Omit<SyncLogEntry, "timestamp">): void {
    const logEntry: SyncLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logEntries.push(logEntry);

    // メモリ使用量制限
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries / 2);
    }

    // コンソールログ出力
    this.outputToConsole(logEntry);
  }

  private outputToConsole(entry: SyncLogEntry): void {
    const logMessage = `[AUTH-SYNC] ${entry.timestamp} | ${entry.source} | ${entry.status} | User: ${entry.userId}`;

    if (entry.status === "success") {
      console.log(
        `✅ ${logMessage}`,
        entry.userInfo ? `| Data: ${JSON.stringify(entry.userInfo)}` : "",
      );
    } else if (entry.status === "error") {
      console.error(`❌ ${logMessage} | Error: ${entry.error}`);
    } else if (entry.status === "retry") {
      console.warn(`🔄 ${logMessage} | Retrying...`);
    }

    // Duration logging
    if (entry.duration) {
      console.log(`⏱️ Sync duration: ${entry.duration}ms`);
    }
  }

  getStats(): {
    total: number;
    success: number;
    error: number;
    postLoginActionRate: number;
    fallbackRate: number;
    averageDuration: number;
  } {
    const total = this.logEntries.length;
    const success = this.logEntries.filter(
      (e) => e.status === "success",
    ).length;
    const error = this.logEntries.filter((e) => e.status === "error").length;
    const postLoginAction = this.logEntries.filter(
      (e) => e.source === "post-login-action",
    ).length;
    const fallback = this.logEntries.filter(
      (e) => e.source === "fallback-sync",
    ).length;

    const durations = this.logEntries
      .filter((e) => e.duration !== undefined)
      .map((e) => e.duration!);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      total,
      success,
      error,
      postLoginActionRate: total > 0 ? (postLoginAction / total) * 100 : 0,
      fallbackRate: total > 0 ? (fallback / total) * 100 : 0,
      averageDuration: Math.round(averageDuration),
    };
  }

  getRecentErrors(limit = 10): SyncLogEntry[] {
    return this.logEntries
      .filter((e) => e.status === "error")
      .slice(-limit)
      .reverse();
  }

  clearLogs(): void {
    this.logEntries = [];
    console.log("[AUTH-SYNC] Logs cleared");
  }
}

export const authSyncLogger = AuthSyncLogger.getInstance();

// ヘルパー関数
export const logSyncSuccess = (
  userId: string,
  source: SyncLogEntry["source"],
  userInfo?: SyncLogEntry["userInfo"],
  duration?: number,
): void => {
  authSyncLogger.logSync({
    userId,
    source,
    status: "success",
    userInfo,
    duration,
  });
};

export const logSyncError = (
  userId: string,
  source: SyncLogEntry["source"],
  error: string,
  duration?: number,
): void => {
  authSyncLogger.logSync({
    userId,
    source,
    status: "error",
    error,
    duration,
  });
};

export const getSyncStats = () => {
  return authSyncLogger.getStats();
};

export const getRecentSyncErrors = (limit?: number) => {
  return authSyncLogger.getRecentErrors(limit);
};
