import { db } from "@tumiki/db/tcp";
import type {
  UserMcpServerInstance,
  User,
  UserToolGroup,
  UserToolGroupTool,
  Tool,
} from "@tumiki/db/prisma";

export interface ValidationResult {
  valid: boolean;
  error?: string;
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

export const validateApiKey = async (
  providedKey: string,
): Promise<ValidationResult> => {
  if (!providedKey || typeof providedKey !== "string") {
    return { valid: false, error: "API key is required" };
  }

  try {
    const apiKey = await db.mcpApiKey.findFirst({
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

    if (!apiKey.userMcpServerInstance.toolGroup.isEnabled) {
      return { valid: false, error: "Tool group is disabled" };
    }

    // 最後に使用された日時を更新
    await db.mcpApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      userMcpServerInstance: apiKey.userMcpServerInstance,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Database error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
