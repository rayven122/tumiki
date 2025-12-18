import type { KeycloakAdminClient } from "../client.js";

/**
 * ユーザーのセッションを無効化
 */
export const invalidateUserSessions = async (
  client: KeycloakAdminClient,
  params: {
    userId: string;
  },
): Promise<{ success: boolean; error?: string }> => {
  const result = await client.invalidateUserSessions(params.userId);

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Failed to invalidate user sessions",
    };
  }

  return { success: true };
};
