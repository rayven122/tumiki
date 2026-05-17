/**
 * 復号済み OAuth credentials の in-memory cache（secretId 単位）。
 *
 * MCP プロキシ常駐中、定期 refresh スケジューラが新トークンをここに書き込み、
 * mcp-proxy.service.ts の getHeaders コールバックが毎リクエスト時にここから最新値を読む。
 * これにより transport を作り直さずに新しい access_token を反映できる。
 */

const cache = new Map<number, Record<string, string>>();

export const setCachedCredentials = (
  secretId: number,
  credentials: Record<string, string>,
): void => {
  cache.set(secretId, credentials);
};

export const getCachedCredentials = (
  secretId: number,
): Record<string, string> | undefined => cache.get(secretId);

export const hasCachedCredentials = (secretId: number): boolean =>
  cache.has(secretId);

export const clearCredentialsCache = (): void => {
  cache.clear();
};

export const deleteCachedCredentials = (secretId: number): void => {
  cache.delete(secretId);
};
