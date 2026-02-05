/**
 * PII マスキングミドルウェア (CE stub)
 *
 * Community Edition では何も処理せずnext()を呼ぶだけのスタブ実装。
 * Enterprise Edition では index.ee.ts の実装が使用される。
 */

import type { Context, Next } from "hono";
import { PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv } from "../../types/index.js";
import { updateExecutionContext } from "../requestLogging/context.js";

/**
 * PII マスキングミドルウェア (CE stub)
 *
 * CE版では何も処理せず素通りする。
 * ログの一貫性のため、piiMaskingMode=DISABLED を明示的にコンテキストに設定する。
 */
export const piiMaskingMiddleware = async (
  _c: Context<HonoEnv>,
  next: Next,
): Promise<void> => {
  // CE版ではPIIマスキングは常にDISABLED
  updateExecutionContext({
    piiMaskingMode: PiiMaskingMode.DISABLED,
  });

  await next();
};
