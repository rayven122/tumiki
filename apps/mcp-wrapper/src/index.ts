import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { processPool } from "./infrastructure/process/processPool.js";
import { config } from "./shared/constants/config.js";
import { logInfo } from "./shared/logger/index.js";

const app = createApp();

const server = serve({
  fetch: app.fetch,
  port: config.port,
});

logInfo("mcp-wrapper started", {
  port: config.port,
  maxProcesses: config.maxProcesses,
  idleTimeoutMs: config.idleTimeoutMs,
  requestTimeoutMs: config.requestTimeoutMs,
});

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  logInfo("Shutting down mcp-wrapper...");
  await processPool.shutdown();
  server.close();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
