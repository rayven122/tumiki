import type { Request, Response } from "express";
import { db } from "@tumiki/db/tcp";
import { generateApiKey, generateClientId } from "../../utils/apiKey.js";
import { sendOAuthErrorResponse } from "../../utils/errorResponse.js";

/**
 * OAuth Dynamic Client Registration (簡易版)
 * McpApiKeyテーブルを使用してクライアント情報を管理
 * POST /oauth/register
 */
interface RegisterRequestBody {
  client_name?: string;
  user_id?: string;
  mcp_server_instance_id?: string;
  grant_types?: string[];
  redirect_uris?: string[];
}

export const handleOAuthRegister = async (
  req: Request<object, object, RegisterRequestBody>,
  res: Response,
): Promise<void> => {
  try {
    const {
      client_name,
      grant_types = ["client_credentials"],
      redirect_uris = ["http://localhost:3000/callback"],
    } = req.body;

    // MCP Inspectorからのリクエストの場合、デフォルト値を使用
    // TODO: 本番環境では適切な認証と動的な値の取得が必要
    const { user_id, mcp_server_instance_id } = req.body;

    // 必須パラメータの最終確認
    if (!user_id || !mcp_server_instance_id) {
      console.error(
        "Missing required parameters: user_id and mcp_server_instance_id",
        "req.body",
        req.body,
      );
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "user_id and mcp_server_instance_id are required",
      );
      return;
    }

    // redirect_urisのバリデーション（MCP仕様準拠）
    // localhost URLまたはHTTPS URLのみ許可
    const validatedRedirectUris: string[] = [];
    for (const uri of redirect_uris) {
      try {
        const url = new URL(uri);
        const isLocalhost =
          url.hostname === "localhost" || url.hostname === "127.0.0.1";
        const isHttps = url.protocol === "https:";
        const isHttp = url.protocol === "http:";

        if ((isLocalhost && isHttp) || isHttps) {
          validatedRedirectUris.push(uri);
        } else {
          sendOAuthErrorResponse(
            res,
            400,
            "invalid_request",
            `Invalid redirect_uri: ${uri}. Must be localhost URL or HTTPS URL`,
          );
          return;
        }
      } catch {
        sendOAuthErrorResponse(
          res,
          400,
          "invalid_request",
          `Invalid redirect_uri format: ${uri}`,
        );
        return;
      }
    }

    if (validatedRedirectUris.length === 0) {
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "At least one valid redirect_uri is required",
      );
      return;
    }

    // grant_typesの処理 - MCP Inspectorが送信するものも受け入れる
    // client_credentialsを必須とするが、他のタイプも含まれていてもOK
    const finalGrantTypes =
      grant_types && grant_types.length > 0
        ? grant_types
        : ["client_credentials"];

    // client_credentialsが含まれていない場合は追加
    if (!finalGrantTypes.includes("client_credentials")) {
      finalGrantTypes.push("client_credentials");
    }

    // MCPサーバーインスタンスの存在確認
    const mcpServerInstance = await db.userMcpServerInstance.findUnique({
      where: {
        id: mcp_server_instance_id,
        deletedAt: null,
      },
    });

    if (!mcpServerInstance) {
      sendOAuthErrorResponse(
        res,
        404,
        "invalid_request",
        "MCP server instance not found",
      );
      return;
    }

    // authTypeがOAUTHまたはBOTHであることを確認
    if (
      mcpServerInstance.authType !== "OAUTH" &&
      mcpServerInstance.authType !== "BOTH"
    ) {
      sendOAuthErrorResponse(
        res,
        400,
        "invalid_request",
        "MCP server instance does not support OAuth authentication",
      );
      return;
    }

    // クライアント認証情報の生成
    const clientId = generateClientId();
    const { apiKey, apiKeyHash } = await generateApiKey();

    // McpApiKeyテーブルに保存
    // clientIdをapiKeyフィールドに、実際のAPIキーをclient_secretとして使用
    await db.mcpApiKey.create({
      data: {
        name: client_name || `OAuth Client (${clientId})`,
        apiKey: clientId, // clientIdをapiKeyフィールドに保存（暗号化される）
        apiKeyHash: apiKeyHash, // client_secretのハッシュ値
        isActive: true,
        userMcpServerInstanceId: mcp_server_instance_id,
        userId: user_id,
      },
    });

    // OAuth 2.0 Dynamic Client Registration Response (RFC 7591準拠)
    const response = {
      client_id: clientId,
      client_secret: apiKey, // 実際のAPIキーをclient_secretとして返却
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // 無期限
      client_name: client_name || `OAuth Client (${clientId})`,
      redirect_uris: validatedRedirectUris, // MCP仕様準拠で追加
      grant_types: finalGrantTypes,
      response_types: ["token"] as string[],
      scope: "mcp:access",
      token_endpoint_auth_method: "client_secret_post",
      // OAuth エンドポイント情報（ProxyServer経由）
      authorization_endpoint: `${
        process.env.MCP_PROXY_URL || "http://localhost:8080"
      }/oauth/authorize`,
      token_endpoint: `${
        process.env.MCP_PROXY_URL || "http://localhost:8080"
      }/oauth/token`,
      // Tumiki拡張フィールド
      mcp_server_instance_id,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Client registration error:", error);
    sendOAuthErrorResponse(res, 500, "server_error", "Registration failed");
  }
};
