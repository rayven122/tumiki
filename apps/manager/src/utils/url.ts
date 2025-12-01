const MCP_PROXY_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_PROXY_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://server.tumiki.cloud"
    : "http://localhost:8080");

/**
 * プロキシサーバーのベースURLを取得
 */
export const getProxyServerUrl = () => {
  return MCP_PROXY_SERVER_URL;
};

export const makeSseProxyServerUrl = (userMcpServerInstanceId: string) => {
  return `${MCP_PROXY_SERVER_URL}/sse/${userMcpServerInstanceId}`;
};

export const makeHttpProxyServerUrl = (userMcpServerInstanceId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp/${userMcpServerInstanceId}`;
};
