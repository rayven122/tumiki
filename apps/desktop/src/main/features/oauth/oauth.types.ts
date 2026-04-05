import type { McpConnection } from "@prisma/desktop-client";

/** MCP OAuth認証セッション（インメモリ管理） */
export type McpOAuthSession = {
  /** CSRF対策用stateパラメータ */
  state: string;
  /** PKCE code_verifier */
  codeVerifier: string;
  /** MCPサーバーURL */
  serverUrl: string;
  /** カタログ情報（MCP登録用） */
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: McpConnection["transportType"];
  command: string | null;
  args: string;
  url: string | null;
  /** セッション開始時刻 */
  createdAt: Date;
};

/** OAuthトークンデータ（McpConnection.credentialsに格納） */
export type McpOAuthTokenData = {
  access_token: string;
  token_type?: string;
  refresh_token?: string;
  /** トークン有効期限（Unix timestamp秒） */
  expires_at?: number;
  scope?: string;
};

/** OAuthフロー開始の入力型（renderer → main） */
export type StartOAuthInput = {
  catalogId: number;
  catalogName: string;
  description: string;
  transportType: McpConnection["transportType"];
  command: string | null;
  args: string;
  url: string;
};

/** OAuthフロー成功時の結果型 */
export type OAuthResult = {
  serverId: number;
  serverName: string;
};
