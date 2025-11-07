/**
 * 認証方式
 *
 * - jwt: JWT Bearer Token認証（Keycloak）
 * - apikey: API Key認証（X-API-Key または Bearer tumiki_...）
 */
export type AuthMethod = "jwt" | "apikey";

/**
 * API Key認証情報
 *
 * API Key認証時にコンテキストに設定される情報。
 * JWT認証時は使用されず、jwtPayloadから直接情報を取得する。
 */
export type ApiKeyAuthInfo = {
  organizationId: string;
  mcpServerInstanceId: string;
};

/**
 * Tumiki カスタムJWTクレーム
 */
export type TumikiJWTClaims = {
  org_id: string; // 組織ID（Organization.id）
  is_org_admin: boolean; // 組織管理者フラグ（OrganizationMember.isAdmin）
  tumiki_user_id: string; // TumikiユーザーID（User.id）
  mcp_instance_id?: string; // MCPサーバーインスタンスID（UserMcpServerInstance.id）- MCP接続時は必須、管理画面では不要
};

/**
 * JWT ペイロード（Keycloak OAuth 認証）
 */
export type JWTPayload = {
  sub: string; // ユーザーID（Keycloak Subject）
  tumiki: TumikiJWTClaims; // Tumikiカスタムクレーム
  azp?: string; // クライアントID (authorized party)
  scope?: string; // スコープ（スペース区切り）
  email?: string; // メールアドレス
  name?: string; // ユーザー名
  preferred_username?: string; // ユーザー名
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  iat?: number; // 発行時刻
  exp?: number; // 有効期限
  iss?: string; // Issuer
  aud?: string | string[]; // Audience
};

/**
 * 名前空間付きツール
 */
export type NamespacedTool = {
  name: string; // "github.create_issue"
  namespace: string; // "github"
  originalName: string; // "create_issue"
  description: string;
  inputSchema: unknown;
};

/**
 * ツール実行結果
 */
export type ToolCallResult = {
  content: Array<{
    type: string;
    text: string;
  }>;
};

/**
 * Remote MCP サーバー設定型
 */
export type RemoteMcpServerConfig = {
  enabled: boolean;
  name: string;
  url: string;
  transportType?: "sse" | "http" | "stdio"; // SSE（デフォルト）、HTTP、Stdio
  authType: "none" | "bearer" | "api_key";
  authToken?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
};

/**
 * Hono 環境型定義
 *
 * コンテキストの型安全性を提供
 *
 * - JWT認証時: jwtPayload のみ設定、authMethod = "jwt"
 * - API Key認証時: apiKeyAuthInfo のみ設定、authMethod = "apikey"
 */
export type HonoEnv = {
  Variables: {
    authMethod?: AuthMethod; // 使用された認証方式
    apiKeyAuthInfo?: ApiKeyAuthInfo; // API Key認証時のみ
    jwtPayload?: JWTPayload; // JWT認証時のみ
  };
};

/**
 * 型ガード: JWT認証済みかチェック
 *
 * @param payload - チェック対象のペイロード
 * @returns JWTPayloadとして有効な場合true
 */
export const isJWTPayload = (payload: unknown): payload is JWTPayload => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return (
    typeof p.sub === "string" &&
    typeof p.tumiki === "object" &&
    p.tumiki !== null &&
    typeof (p.tumiki as Record<string, unknown>).org_id === "string" &&
    typeof (p.tumiki as Record<string, unknown>).tumiki_user_id === "string" &&
    typeof (p.tumiki as Record<string, unknown>).is_org_admin === "boolean"
  );
};

/**
 * 型ガード: API Key認証情報が有効かチェック
 *
 * @param info - チェック対象の認証情報
 * @returns ApiKeyAuthInfoとして有効な場合true
 */
export const isApiKeyAuthInfo = (info: unknown): info is ApiKeyAuthInfo => {
  if (typeof info !== "object" || info === null) {
    return false;
  }

  const i = info as Record<string, unknown>;

  return (
    typeof i.organizationId === "string" &&
    typeof i.mcpServerInstanceId === "string"
  );
};

/**
 * 型ガード: MCP接続に必要なJWTペイロードかチェック
 *
 * MCP接続には mcp_instance_id が必須
 *
 * @param payload - チェック対象のペイロード
 * @returns MCP接続可能な場合true
 */
export const isValidMcpJWTPayload = (
  payload: unknown,
): payload is JWTPayload => {
  if (!isJWTPayload(payload)) {
    return false;
  }

  return typeof payload.tumiki.mcp_instance_id === "string";
};
