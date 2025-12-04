import "server-only";

import crypto from "crypto";

/**
 * APIキーを生成する
 * @returns 生成されたAPIキー
 */
const API_KEY_PREFIX = "tumiki_mcp_";
const API_KEY_LENGTH = 32;

export const generateApiKey = () => {
  const rawKey = crypto.randomBytes(API_KEY_LENGTH).toString("base64url");
  const fullKey = `${API_KEY_PREFIX}${rawKey}`;
  return fullKey;
};
