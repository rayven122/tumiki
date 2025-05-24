const MCP_PROXY_SERVER_URL =
  process.env.NODE_ENV === "production"
    ? "https://fast-mcp-server-proxy-production.up.railway.app"
    : "http://localhost:8080";

export const makeMcpProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp?api-key=${apiKeyId}`;
};
