import { z } from "zod";

/** 非負整数ミリ秒のスキーマ（未設定・空文字・不正値は undefined） */
const nonNegativeIntMs = z.coerce
  .number()
  .int()
  .nonnegative()
  .optional()
  .catch(undefined);

/**
 * Desktop アプリの環境変数スキーマ
 * DB接続タイムアウト・リトライ遅延の設定
 */
const desktopEnvSchema = z.object({
  /** DB接続タイムアウト（ms）。デフォルト: 10000 */
  DESKTOP_DB_TIMEOUT_MS: nonNegativeIntMs,
  /** リトライ初回遅延（ms）。デフォルト: 1000 */
  DESKTOP_DB_RETRY_INITIAL_MS: nonNegativeIntMs,
  /** リトライ最大遅延（ms）。デフォルト: 15000 */
  DESKTOP_DB_RETRY_MAX_MS: nonNegativeIntMs,
});

export const env = desktopEnvSchema.parse(process.env);
