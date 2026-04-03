import { z } from "zod";

/** 非負整数ミリ秒のスキーマ（未設定時はデフォルト値、不正値はエラー） */
const nonNegativeIntMs = (defaultValue: number) =>
  z.coerce.number().int().nonnegative().default(defaultValue);

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
