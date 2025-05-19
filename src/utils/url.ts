const MCP_PROXY_SERVER_URL =
  "https://fast-mcp-server-proxy-production.up.railway.app";

export const makeMcpProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp?api-key=${apiKeyId}`;
};
