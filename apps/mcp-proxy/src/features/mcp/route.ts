/**
 * MCP フィーチャールート
 *
 * MCP プロトコルリクエストのルーティングを定義する
 */

import { Hono } from "hono";

import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { mcpRequestHandler } from "./mcpRequestHandler.js";
import { authMiddleware } from "./middleware/auth/index.js";
import { piiMaskingMiddleware } from "./middleware/piiMasking/index.js";
import { mcpRequestLoggingMiddleware } from "./middleware/requestLogging/index.js";
import { toonConversionMiddleware } from "./middleware/toonConversion/index.js";

export const mcpFeatureRoute = new Hono<HonoEnv>();

mcpFeatureRoute.post(
  "/mcp/:mcpServerId",
  mcpRequestLoggingMiddleware,
  authMiddleware,
  piiMaskingMiddleware,
  toonConversionMiddleware,
  mcpRequestHandler,
);
