import { db } from "@tumiki/db/tcp";
import pMemoize from "p-memoize";
import ExpiryMap from "expiry-map";
import type {
  UserMcpServerInstance,
  User,
  UserToolGroup,
  UserToolGroupTool,
  Tool,
  McpApiKey,
} from "@tumiki/db/prisma";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  apiKey?: McpApiKey;
  userMcpServerInstance?: UserMcpServerInstance & {
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

// 内部のvalidateApiKey関数（メモ化されない元の実装）
const _validateApiKey = async (
  providedKey: string,
): Promise<ValidationResult> => {
  if (!providedKey || typeof providedKey !== "string") {
    return { valid: false, error: "API key is required" };
  }

  try {
    const apiKey = await db.mcpApiKey.findUnique({
      where: {
        apiKey: providedKey,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        userMcpServerInstance: {
          include: {
            user: true,
            toolGroup: {
              include: {
                toolGroupTools: {
                  include: {
                    tool: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!apiKey) {
      return { valid: false, error: "Invalid or expired API key" };
    }

    // UserMcpServerInstanceが論理削除されていないか確認
    if (apiKey.userMcpServerInstance.deletedAt) {
      return { valid: false, error: "MCP server instance has been deleted" };
    }

    if (!apiKey.userMcpServerInstance.toolGroup.isEnabled) {
      return { valid: false, error: "Tool group is disabled" };
    }

    // 最後に使用された日時を更新（キャッシュミス時のみ）
    void db.mcpApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      apiKey,
      userMcpServerInstance: apiKey.userMcpServerInstance,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // データベース接続エラーかクエリエラーかを判定
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      return {
        valid: false,
        error: "Database connection failed. Please try again later.",
      };
    }

    if (errorMessage.includes("timeout")) {
      return {
        valid: false,
        error: "Database query timeout. Please try again.",
      };
    }

    // その他のエラー
    return {
      valid: false,
      error: `API key validation failed: ${errorMessage}`,
    };
  }
};

// 5分間でキャッシュが期限切れになるExpiryMapを作成
const cache = new ExpiryMap(5 * 60 * 1000); // 5分間キャッシュ

// p-memoizeを使ってvalidateApiKeyをメモ化
export const validateApiKey = pMemoize(_validateApiKey, {
  cache,
  cacheKey: ([providedKey]) => providedKey, // APIキーをキャッシュキーとして使用
});

// キャッシュクリア用の関数をエクスポート
export const clearValidationCache = () => {
  cache.clear();
};

// 特定のAPIキーのキャッシュを削除
export const clearValidationCacheForKey = (apiKey: string) => {
  cache.delete(apiKey);
};
