const MCP_PROXY_SERVER_URL =
  process.env.NODE_ENV === "production"
    ? "https://server.tumiki.cloud"
    : "http://localhost:8080";

export const makeMcpProxyServerUrl = (apiKeyId: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp?api-key=${apiKeyId}`;
};
