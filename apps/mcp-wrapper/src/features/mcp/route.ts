import { Hono } from "hono";
import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { mcpRequestHandler } from "./mcpRequestHandler.js";

export const mcpRoute = new Hono<HonoEnv>();

/**
 * MCPリクエストルート
 *
 * POST /mcp/:serverName - JSON-RPCリクエストをMCPサーバーに転送
 */
mcpRoute.post("/:serverName", mcpRequestHandler);
