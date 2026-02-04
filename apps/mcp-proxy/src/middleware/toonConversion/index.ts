/**
 * TOON 変換ミドルウェア (CE stub)
 *
 * Community Edition では何も処理せずnext()を呼ぶだけのスタブ実装。
 * Enterprise Edition では index.ee.ts の実装が使用される。
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";

/**
 * TOON 変換ミドルウェア (CE stub)
 *
 * CE版では何も処理せず素通りする
 */
export const toonConversionMiddleware = async (
  _c: Context<HonoEnv>,
  next: Next,
): Promise<void> => {
  await next();
};
