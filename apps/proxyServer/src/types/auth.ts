import type {
  User,
  UserMcpServerInstance,
  UserToolGroup,
  UserToolGroupTool,
  Tool,
  McpApiKey,
} from "@tumiki/db/prisma";

// APIキー検証の結果型
export type ApiKeyValidationResult =
  | {
      valid: true;
      apiKey: McpApiKey;
      userMcpServerInstance: UserMcpServerInstance & {
        user: User;
        toolGroup: UserToolGroup & {
          toolGroupTools: Array<
            UserToolGroupTool & {
              tool: Tool;
            }
          >;
        };
      };
    }
  | {
      valid: false;
      error: string;
    };

// OAuth検証の結果型
export type OAuthValidationResult =
  | {
      valid: true;
      userId: string;
      issuer?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      valid: false;
      error: string;
    };

// 統合認証の結果型（authMiddlewareで使用）
export type AuthValidationResult = ApiKeyValidationResult;
