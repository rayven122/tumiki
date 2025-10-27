import type { AuthInfo } from "./index.js";

/**
 * Hono 環境型定義
 *
 * コンテキストの型安全性を提供
 */
export type HonoEnv = {
  Variables: {
    authInfo: AuthInfo;
  };
};
