/**
 * MCP サーバーのテスト用モック環境変数
 *
 * 本番環境では .env ファイルから実際の値を読み込みます
 * このファイルは開発・テスト用のプレースホルダー値を提供します
 */
export const MCP_ENV_MOCK_KEYS: Record<string, string> = {
  // DeepL MCP
  "X-DeepL-API-Key": "mock-deepl-api-key-for-testing",
};
