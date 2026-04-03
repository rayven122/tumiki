import { z } from "zod";

/** 非負整数ミリ秒のスキーマ（未設定・空文字・不正値はデフォルトにフォールバック） */
const nonNegativeIntMs = (defaultValue: number) =>
  z.coerce.number().int().nonnegative().catch(defaultValue);

/**
 * Desktop アプリの環境変数スキーマ
 * DB接続タイムアウト・リトライ遅延の設定
 */
const desktopEnvSchema = z.object({
  DESKTOP_DB_TIMEOUT_MS: nonNegativeIntMs(10000),
  DESKTOP_DB_RETRY_INITIAL_MS: nonNegativeIntMs(1000),
  DESKTOP_DB_RETRY_MAX_MS: nonNegativeIntMs(15000),
});

export const env = desktopEnvSchema.parse(process.env);
