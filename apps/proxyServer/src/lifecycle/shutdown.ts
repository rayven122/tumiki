import {
  connections,
  cleanupConnection,
} from "../connection/connectionManager.js";

/**
 * グレースフルシャットダウン処理
 */
export const gracefulShutdown = async (): Promise<void> => {
  console.log("Shutting down server...");

  // Close all active connections gracefully
  const cleanupPromises: Promise<void>[] = [];
  for (const sessionId of connections.keys()) {
    cleanupPromises.push(cleanupConnection(sessionId));
  }

  try {
    await Promise.all(cleanupPromises);
    console.log("All connections closed gracefully");
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
  }

  console.log("Server shutdown complete");
};

/**
 * シャットダウンシグナルハンドラーを設定
 */
export const setupShutdownHandlers = (recoveryManagerCleanup?: () => void): void => {
  // Handle server shutdown
  process.on("SIGINT", () => {
    void (async () => {
      // 回復マネージャーを停止
      if (recoveryManagerCleanup) {
        recoveryManagerCleanup();
      }
      
      await gracefulShutdown();
      process.exit(0);
    })();
  });

  process.on("SIGTERM", () => {
    void (async () => {
      console.log("Received SIGTERM, shutting down gracefully...");
      
      // 回復マネージャーを停止
      if (recoveryManagerCleanup) {
        recoveryManagerCleanup();
      }
      
      process.emit("SIGINT");
    })();
  });

  // Unhandled promise rejection handling
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });
};
