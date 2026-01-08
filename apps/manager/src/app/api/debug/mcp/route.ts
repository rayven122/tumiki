/**
 * MCPツール取得のデバッグ用エンドポイント
 * 開発環境でのみ有効
 *
 * @ai-sdk/mcp を使用した新実装に対応
 */
import { auth } from "~/auth";
import { isProductionEnvironment } from "@/lib/constants";
import { closeMcpClients, getMcpToolsFromServers } from "@/lib/ai/tools/mcp";

export const GET = async (request: Request) => {
  // 本番環境では無効
  if (isProductionEnvironment) {
    return new Response("Not available in production", { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mcpServerIds = searchParams.get("ids")?.split(",") ?? [];

  type McpResultType = {
    toolCount: number;
    toolNames: string[];
    successfulServers: string[];
    errors: Array<{ mcpServerId: string; message: string }>;
  };

  const debugInfo = {
    hasAccessToken: !!session.accessToken,
    accessTokenLength: session.accessToken?.length ?? 0,
    mcpServerIds,
    mcpResult: null as McpResultType | null,
  };

  if (mcpServerIds.length > 0 && session.accessToken) {
    // @ai-sdk/mcp を使用してツールを取得
    const mcpResult = await getMcpToolsFromServers(
      mcpServerIds,
      session.accessToken,
    );

    // 非ストリーミングの場合は取得後にクライアントを閉じる
    // @see https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools#client-lifecycle
    try {
      debugInfo.mcpResult = {
        toolCount: mcpResult.toolNames.length,
        toolNames: mcpResult.toolNames,
        successfulServers: mcpResult.successfulServers,
        errors: mcpResult.errors.map((e) => ({
          mcpServerId: e.mcpServerId,
          message: e.message,
        })),
      };
    } finally {
      await closeMcpClients(mcpResult.clients);
    }
  }

  return Response.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
