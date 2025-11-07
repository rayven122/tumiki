import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { integratedAuthMiddleware } from "../middleware/auth/index.js";
import { mcpHandler } from "../handlers/mcp/index.js";

export const mcpRoute = new Hono<HonoEnv>();

mcpRoute.post(
  "/mcp/:userMcpServerInstanceId",
  integratedAuthMiddleware,
  mcpHandler,
);
