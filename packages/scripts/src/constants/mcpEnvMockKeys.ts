/**
 * MCP サーバーのテスト用モック環境変数
 *
 * 本番環境では .env ファイルから実際の値を読み込みます
 * このファイルは開発・テスト用のプレースホルダー値を提供します
 */
export const MCP_ENV_MOCK_KEYS: Record<string, string> = {
  // DeepL MCP
  "X-DeepL-API-Key": "mock-deepl-api-key-for-testing",

  // Brave Search MCP
  "X-Brave-API-Key": "mock-brave-search-api-key-for-testing",

  // Clarity MCP
  "X-Clarity-API-Token": "mock-clarity-api-token-for-testing",

  // Discord MCP
  "X-Discord-Token": "mock-discord-bot-token-for-testing",

  // Figma MCP (Cloud)
  "X-Figma-API-Key": "mock-figma-api-key-for-testing",

  // Gemini MCP
  "X-Gemini-API-Key": "mock-gemini-api-key-for-testing",
  "X-Gemini-Model": "gemini-2.0-flash",

  // Kubernetes MCP
  "X-Allow-Only-Non-Destructive-Tools": "true",

  // LINE Bot MCP
  "X-Channel-Access-Token": "mock-line-channel-access-token-for-testing",
  "X-Destination-User-ID": "mock-line-user-id-for-testing",

  // microCMS MCP
  "X-API-Key": "mock-microcms-api-key-for-testing",
  "X-Service-ID": "mock-microcms-service-id-for-testing",

  // n8n MCP
  "X-MCP-Mode": "development",
  "X-Log-Level": "info",
  "X-Disable-Console-Output": "false",
  "X-N8N-API-Key": "mock-n8n-api-key-for-testing",
  "X-N8N-API-URL": "https://mock-n8n-instance.example.com",

  // Playwright MCP
  // (no environment variables required)

  // Slack MCP
  "X-Slack-MCP-XOXP-Token": "xoxp-mock-slack-bot-token-for-testing",
};
