import { db } from "@tumiki/db/tcp";
import type { OAuthClient } from "@tumiki/db";

/**
 * OAuth クライアント認証結果
 */
export type ClientAuthResult = {
  valid: boolean;
  client?: OAuthClient;
  error?: string;
};

/**
 * OAuthクライアントのBasic認証をパース
 */
export const parseBasicAuth = (
  authHeader: string,
): { clientId: string; clientSecret: string } | null => {
  if (!authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "utf-8",
    );
    const [clientId, clientSecret] = credentials.split(":");

    if (!clientId || !clientSecret) {
      return null;
    }

    return { clientId, clientSecret };
  } catch {
    return null;
  }
};

/**
 * OAuthクライアントを認証
 * client_secret_basic, client_secret_post両方をサポート
 */
export const authenticateClient = async (
  clientId: string,
  clientSecret: string,
  mcpServerInstanceId?: string,
): Promise<ClientAuthResult> => {
  try {
    // クライアントIDで検索
    const client = await db.oAuthClient.findUnique({
      where: {
        clientId,
      },
    });

    if (!client) {
      return {
        valid: false,
        error: "Client not found",
      };
    }

    // MCPサーバーインスタンスIDが指定されている場合、一致を確認
    if (
      mcpServerInstanceId &&
      client.userMcpServerInstanceId !== mcpServerInstanceId
    ) {
      return {
        valid: false,
        error: "Client does not belong to this MCP server instance",
      };
    }

    // prisma-field-encryptionがクライアントシークレットの検証を行う
    // clientSecretがハッシュと一致するか確認
    const isValid = await db.oAuthClient.findFirst({
      where: {
        clientId,
        clientSecret, // prisma-field-encryptionが自動的にハッシュ比較を行う
      },
    });

    if (!isValid) {
      return {
        valid: false,
        error: "Invalid client credentials",
      };
    }

    // 遅延バインディング中のクライアントかチェック
    const metadata = client.metadata as { isPending?: boolean } | null;
    if (metadata?.isPending) {
      return {
        valid: false,
        error: "Client is pending user binding",
      };
    }

    return {
      valid: true,
      client,
    };
  } catch (error) {
    console.error("Client authentication error:", error);
    return {
      valid: false,
      error: "Internal authentication error",
    };
  }
};

/**
 * リクエストからクライアント認証情報を抽出
 */
export const extractClientCredentials = (req: {
  headers: Record<string, string | string[] | undefined>;
  body?: { client_id?: string; client_secret?: string };
}): { clientId: string; clientSecret: string } | null => {
  // 1. Basic認証ヘッダーから取得
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Basic ")) {
    const parsed = parseBasicAuth(authHeader);
    if (parsed) {
      return parsed;
    }
  }

  // 2. POSTボディから取得（client_secret_post）
  if (req.body?.client_id && req.body?.client_secret) {
    return {
      clientId: req.body.client_id,
      clientSecret: req.body.client_secret,
    };
  }

  return null;
};
