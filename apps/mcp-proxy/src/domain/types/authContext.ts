/**
 * 認証タイプ
 */
type AuthType = "NONE" | "API_KEY" | "OAUTH";

/**
 * PIIマスキングモード
 */
type PiiMaskingMode = "DISABLED" | "REQUEST" | "RESPONSE" | "BOTH";

/**
 * 統一認証コンテキスト
 *
 * 認証ミドルウェア通過後に必ず設定される共通の認証情報。
 */
type AuthContext = {
  authMethod: AuthType;
  organizationId: string;
  userId: string;
  mcpServerId: string;
  mcpApiKeyId?: string;
  piiMaskingMode: PiiMaskingMode;
  piiInfoTypes: string[];
  toonConversionEnabled: boolean;
};

export type { AuthType, PiiMaskingMode, AuthContext };
