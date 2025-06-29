const MCP_PROXY_SERVER_URL =
  process.env.NODE_ENV === "production"
    ? "https://server.tumiki.cloud"
    : "http://localhost:8080";

export const makeSseProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/sse?api-key=${apiKeyId}`;
};

export const makeHttpProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp?api-key=${apiKeyId}`;
};
