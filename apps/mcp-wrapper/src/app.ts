import { Hono } from "hono";
import { healthRoute } from "./features/health/route.js";
import { statusRoute } from "./features/status/route.js";
import { mcpRoute } from "./features/mcp/route.js";
import type { HonoEnv } from "./shared/types/honoEnv.js";

/**
 * Honoアプリケーションを作成
 */
export const createApp = () => {
  const app = new Hono<HonoEnv>();

  // ルートをマウント
  app.route("/health", healthRoute);
  app.route("/status", statusRoute);
  app.route("/mcp", mcpRoute);

  return app;
};
