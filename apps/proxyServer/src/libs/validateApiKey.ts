import { db } from "@tumiki/db/tcp";
import type {
  UserMcpServerInstance,
  UserToolGroup,
  UserToolGroupTool,
  Tool,
  McpApiKey,
} from "@tumiki/db/prisma";
import type { AuthCache } from "../utils/cache/authCache.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  apiKey?: McpApiKey;
  userMcpServerInstance?: UserMcpServerInstance & {
    toolGroup: UserToolGroup & {
      toolGroupTools: Array<
        UserToolGroupTool & {
          tool: Tool;
        }
      >;
    };
  };
}

// AuthCacheインスタンスを受け取る
let authCacheInstance: AuthCache | null = null;

export const setAuthCache = (cache: AuthCache) => {
  authCacheInstance = cache;
};

// 内部のvalidateApiKey関数（キャッシュなしの実装）
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

// AuthCacheを使用するvalidateApiKey関数
export const validateApiKey = async (
  providedKey: string,
): Promise<ValidationResult> => {
  // AuthCacheが設定されていない場合は直接実行
  if (!authCacheInstance) {
    return _validateApiKey(providedKey);
  }

  // キャッシュから取得を試みる
  const cachedEntry = authCacheInstance.get(providedKey);
  if (cachedEntry) {
    // キャッシュエントリーからValidationResultを構築
    return {
      valid: cachedEntry.valid,
      error: cachedEntry.error,
      userMcpServerInstance:
        cachedEntry.fullData as ValidationResult["userMcpServerInstance"],
    };
  }

  // キャッシュミスの場合はDBから取得
  const result = await _validateApiKey(providedKey);

  // 結果をキャッシュに保存
  authCacheInstance.set(providedKey, result);

  return result;
};

// キャッシュクリア用の関数をエクスポート（AuthCache経由）
export const clearValidationCache = () => {
  if (authCacheInstance) {
    authCacheInstance.clear();
  }
};

// 特定のAPIキーのキャッシュを削除（AuthCache経由）
export const clearValidationCacheForKey = (apiKey: string) => {
  if (authCacheInstance) {
    authCacheInstance.delete(apiKey);
  }
};
