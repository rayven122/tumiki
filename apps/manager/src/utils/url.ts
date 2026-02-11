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

export const makeSseProxyServerUrl = (slug: string) => {
  return `${MCP_PROXY_SERVER_URL}/sse/${slug}`;
};

export const makeHttpProxyServerUrl = (slug: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp/${slug}`;
};
