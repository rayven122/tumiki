import { decryptToken } from "./encryption";

/**
 * 暗号化済みか平文かを判定して復号する（既存データとの互換性を保つ）
 */
export const decryptCredentials = async (
  credentials: string,
): Promise<string> => {
  if (credentials.startsWith("safe:") || credentials.startsWith("fallback:")) {
    return decryptToken(credentials);
  }
  return credentials;
};
