import type { Server } from "node:http";
import { closeDb, initializeDb } from "./shared/db";
import * as logger from "./shared/utils/logger";
import { pruneOldTelemetry } from "./features/ai-coding-telemetry/ai-coding-telemetry.service";
import {
  startAnalyticsMcpServer,
  startAnalyticsReceiverSingleton,
} from "./features/ai-coding-telemetry/ai-coding-telemetry.analytics-sidecar";

const startAnalyticsNodeMode = async (): Promise<void> => {
  await initializeDb();

  const runtime = await startAnalyticsReceiverSingleton();

  const runTelemetryPrune = (): void => {
    void pruneOldTelemetry().catch((error: unknown) => {
      logger.error("Failed to prune old AI coding telemetry", { error });
    });
  };
  runTelemetryPrune();
  const telemetryPruneInterval = setInterval(
    runTelemetryPrune,
    24 * 60 * 60 * 1000,
  );

  let isShuttingDown = false;
  const closeServer = (server: Server): Promise<void> =>
    new Promise((resolve) => {
      server.close(() => resolve());
    });

  const shutdown = (): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(telemetryPruneInterval);
    void (async () => {
      if (runtime.server) {
        await closeServer(runtime.server);
      }
      await closeDb().catch((error: unknown) => {
        logger.error("Failed to close analytics DB", { error });
      });
    })().finally(() => process.exit(0));
  };

  startAnalyticsMcpServer(runtime);

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.once("end", shutdown);
};

void startAnalyticsNodeMode().catch((error: unknown) => {
  logger.error("Failed to start analytics node mode", { error });
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[tumiki-analytics] startup failed: ${message}\n`);
  process.exit(1);
});
