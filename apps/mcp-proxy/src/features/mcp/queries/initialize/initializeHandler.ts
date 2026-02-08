/**
 * Initialize ハンドラー
 *
 * MCP プロトコルハンドシェイク処理
 */
export const createInitializeHandler = () => {
  return () => ({
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: {
      name: "Tumiki MCP Proxy",
      version: "0.1.0",
    },
  });
};
