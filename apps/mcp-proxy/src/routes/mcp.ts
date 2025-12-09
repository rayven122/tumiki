import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { authMiddleware } from "../middleware/auth/index.js";
import { mcpRequestLoggingMiddleware } from "../middleware/requestLogging/index.js";
import { mcpHandler } from "../handlers/mcpHandler.js";

export const mcpRoute = new Hono<HonoEnv>();

mcpRoute.post(
  "/mcp/:mcpServerId",
  mcpRequestLoggingMiddleware,
  authMiddleware,
  mcpHandler,
);
