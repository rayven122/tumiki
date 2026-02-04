/**
 * MCP Request Logging Middleware (CE stub)
 *
 * Community Edition では何も処理せずnext()を呼ぶだけのスタブ実装。
 * Enterprise Edition では index.ee.ts の実装が使用される。
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";

/**
 * MCP Request Logging Middleware (CE stub)
 *
 * CE版では何も処理せず素通りする
 */
export const mcpRequestLoggingMiddleware = async (
  _c: Context<HonoEnv>,
  next: Next,
): Promise<void> => {
  await next();
};
