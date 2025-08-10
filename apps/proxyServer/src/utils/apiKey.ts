import crypto from "node:crypto";
import bcrypt from "bcrypt";

/**
 * APIキー（OAuth client_secret）を生成
 */
export const generateApiKey = async (): Promise<{
  apiKey: string;
  apiKeyHash: string;
}> => {
  const apiKey = crypto.randomBytes(32).toString("base64url");
  const apiKeyHash = await bcrypt.hash(apiKey, 10);
  return { apiKey, apiKeyHash };
};

/**
 * APIキー（OAuth client_secret）を検証
 */
export const verifyApiKey = async (
  apiKey: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(apiKey, hash);
};

/**
 * OAuth client_idを生成
 */
export const generateClientId = (): string => {
  return `client_${crypto.randomBytes(16).toString("hex")}`;
};
