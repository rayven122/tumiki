import { type Config, initializeMcpApiHandler } from "./mcp-api-handler";
import { createServerResponseAdapter } from "./server-response-adapter";
import type {
  Server,
  ServerOptions,
} from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Creates a MCP handler that can be used to handle MCP requests.
 * @param initializeServer - A function that initializes the MCP server. Use this to access the server instance and register tools, prompts, and resources.
 * @param serverOptions - Options for the MCP server.
 * @param config - Configuration for the MCP handler.
 * @returns A function that can be used to handle MCP requests.
 */
export default function createMcpRouteHandler(
  initializeServer: (server: Server) => void,
  serverOptions?: ServerOptions,
  config?: Config,
): (request: Request) => Promise<Response> {
  const mcpHandler = initializeMcpApiHandler(
    initializeServer,
    serverOptions,
    config,
  );
  return (request: Request) => {
    return createServerResponseAdapter(request.signal, (res) => {
      return mcpHandler(request, res);
    });
  };
}
