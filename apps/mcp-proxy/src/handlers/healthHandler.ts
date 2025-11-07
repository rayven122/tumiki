import type { Context } from "hono";
import type { HonoEnv } from "../types/index.js";
import { logInfo } from "../libs/logger/index.js";

/**
 * ヘルスチェックハンドラー
 * サーバーの稼働状態を返します
 */
export const healthHandler = (c: Context<HonoEnv>) => {
  logInfo("Health check accessed", {
    userAgent: c.req.header("User-Agent"),
    ip: c.req.header("X-Forwarded-For"),
  });

  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
