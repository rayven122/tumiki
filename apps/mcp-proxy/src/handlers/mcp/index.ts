import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { Context } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { getAllTools, callTool } from "../../libs/mcp/index.js";
import { handleError } from "../../libs/error/handler.js";
import { resolveUserMcpServerInstance } from "../../services/instanceResolver.js";
import { checkPermission } from "../../services/permissionService.js";
import {
  createPermissionDeniedError,
  createUnauthorizedError,
} from "../../libs/error/index.js";
import { logDebug, logError, logWarn } from "../../libs/logger/index.js";

/**
 * MCPサーバーインスタンスを作成
 * Low-Level Server APIを使用して、JSON-RPC 2.0プロトコルを自動処理
 */
const createMcpServer = (instanceId: string) => {
  const server = new Server(
    {
      name: "Tumiki MCP Proxy",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Initialize handler - SDKが自動的にプロトコルハンドシェイク処理
  server.setRequestHandler(InitializeRequestSchema, async () => {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: {
        name: "Tumiki MCP Proxy",
        version: "0.1.0",
      },
    };
  });

  // Tools list handler - SDKが自動的にバリデーションとJSON-RPC形式化
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await getAllTools(instanceId);

    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Tools call handler - SDKが自動的にバリデーションとJSON-RPC形式化
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const result = await callTool(instanceId, name, args ?? {});

    return { content: result.content };
  });

  return server;
};

/**
 * MCPメインハンドラー
 * Low-Level Server APIを使用してJSON-RPC 2.0リクエストを自動処理
 *
 * mcp_instance_id はURLパスから取得し、JWTの org_id と照合して権限検証を行う
 */
export const mcpHandler = async (c: Context<HonoEnv>) => {
  const userMcpServerInstanceId = c.req.param("userMcpServerInstanceId");

  // 認証情報から organizationId を取得
  const jwtPayload = c.get("jwtPayload");
  const apiKeyAuthInfo = c.get("apiKeyAuthInfo");
  const oauthAuthInfo = c.get("oauthAuthInfo");
  const authMethod = c.get("authMethod");
  const organizationId =
    jwtPayload?.tumiki.org_id ??
    apiKeyAuthInfo?.organizationId ??
    oauthAuthInfo?.organizationId ??
    "";

  try {
    // JWT認証の場合: URL instance_id を使用してインスタンス検証と権限チェック
    if (authMethod === "jwt" && jwtPayload) {
      // 開発モードバイパス: dev-instance-id の場合はスキップ
      const isDevInstanceBypass =
        process.env.DEV_MODE === "true" &&
        process.env.NODE_ENV === "development" &&
        userMcpServerInstanceId === "dev-instance-id";

      if (isDevInstanceBypass) {
        logWarn(
          "🔓 Development mode: Instance resolution and permission check bypassed",
          {
            instanceId: userMcpServerInstanceId,
          },
        );
      } else {
        // インスタンス存在確認と組織一致チェック
        await resolveUserMcpServerInstance(jwtPayload, userMcpServerInstanceId);

        // 権限チェック: MCP_SERVER_INSTANCE への READ アクセス
        const hasPermission = await checkPermission(
          jwtPayload.tumiki.tumiki_user_id,
          jwtPayload.tumiki.org_id,
          "MCP_SERVER_INSTANCE",
          "READ",
          userMcpServerInstanceId,
        );

        if (!hasPermission) {
          logDebug("JWT authentication: Permission denied for MCP access", {
            userId: jwtPayload.tumiki.tumiki_user_id,
            orgId: jwtPayload.tumiki.org_id,
            instanceId: userMcpServerInstanceId,
          });

          return c.json(
            createPermissionDeniedError(
              "Permission denied: READ access to MCP_SERVER_INSTANCE",
            ),
            403,
          );
        }
      }
    }

    // OAuth認証の場合: oauthAuthInfo.instanceId と URL instance_id の一致を確認
    if (authMethod === "oauth" && oauthAuthInfo) {
      if (oauthAuthInfo.instanceId !== userMcpServerInstanceId) {
        logError(
          "OAuth authentication: Instance ID mismatch",
          new Error("Instance ID mismatch"),
          {
            oauthInstanceId: oauthAuthInfo.instanceId,
            urlInstanceId: userMcpServerInstanceId,
          },
        );

        return c.json(
          createUnauthorizedError(
            "Instance ID mismatch. OAuth token is not valid for this MCP instance.",
          ),
          401,
        );
      }
    }

    // API Key認証の場合: apiKeyAuthInfo.mcpServerInstanceId と URL instance_id の一致を確認
    if (authMethod === "apikey" && apiKeyAuthInfo) {
      if (apiKeyAuthInfo.mcpServerInstanceId !== userMcpServerInstanceId) {
        logError(
          "API Key authentication: Instance ID mismatch",
          new Error("Instance ID mismatch"),
          {
            apiKeyInstanceId: apiKeyAuthInfo.mcpServerInstanceId,
            urlInstanceId: userMcpServerInstanceId,
          },
        );

        return c.json(
          createUnauthorizedError(
            "Instance ID mismatch. API Key is not valid for this MCP instance.",
          ),
          401,
        );
      }
    }

    // MCPサーバーインスタンスを作成
    const server = createMcpServer(userMcpServerInstanceId);

    // HTTPトランスポートを作成（ステートレスモード）
    // Cloud Run向けにセッション管理を無効化
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // ステートレスモード
    });

    // サーバーとトランスポートを接続
    await server.connect(transport);

    // HonoのFetch APIリクエスト/レスポンスをNode.js形式に変換
    const { req, res } = toReqRes(c.req.raw);

    // HTTPリクエストを処理
    // SDKがJSON-RPC 2.0プロトコル（検証、ルーティング、エラー処理）を自動処理
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await c.req.json();
    await transport.handleRequest(req, res, body);

    // Node.jsレスポンスをFetch APIレスポンスに変換して返却
    return toFetchResponse(res);
  } catch (error) {
    return handleError(c, error as Error, {
      requestId: null,
      errorCode: -32603,
      errorMessage: "Internal error",
      organizationId,
      instanceId: userMcpServerInstanceId,
      logMessage: "Failed to handle MCP request",
    });
  }
};
