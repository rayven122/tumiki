import { transports, sessions } from "../services/transport.js";
import { stopMetricsCollection } from "../lib/metrics.js";
import { logger } from "../lib/logger.js";

/**
 * グレースフルシャットダウン処理
 */
export const gracefulShutdown = async (): Promise<void> => {
  logger.info("Shutting down server...");

  // Stop metrics collection
  stopMetricsCollection();
  logger.info("Metrics collection stopped");

  // Close all active StreamableHTTP sessions gracefully
  const cleanupPromises: Promise<void>[] = [];
  for (const [sessionId] of transports) {
    cleanupPromises.push(
      (async () => {
        try {
          // StreamableHTTPTransportのクリーンアップ（必要に応じて）
          logger.info("Cleaning up session", { sessionId });
        } catch (error) {
          logger.error("Error cleaning up session", {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })(),
    );
  }

  try {
    await Promise.all(cleanupPromises);

    // Clear all sessions and transports
    transports.clear();
    sessions.clear();

    logger.info("All sessions closed gracefully");
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info("Server shutdown complete");
};

/**
 * シャットダウンシグナルハンドラーを設定
 */
export const setupShutdownHandlers = (): void => {
  // Handle server shutdown
  process.on("SIGINT", () => {
    void (async () => {
      await gracefulShutdown();
      process.exit(0);
    })();
  });

  process.on("SIGTERM", () => {
    void (async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await gracefulShutdown();
      process.exit(0);
    })();
  });

  // Unhandled promise rejection handling
  process.on("unhandledRejection", (reason, _promise) => {
    logger.error("Unhandled Rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
};
