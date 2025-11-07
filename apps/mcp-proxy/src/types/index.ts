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
 * - JWT認証時: jwtPayload のみ設定
 * - API Key認証時: apiKeyAuthInfo のみ設定
 */
export type HonoEnv = {
  Variables: {
    apiKeyAuthInfo?: ApiKeyAuthInfo; // API Key認証時のみ
    jwtPayload?: JWTPayload; // JWT認証時のみ
  };
};
