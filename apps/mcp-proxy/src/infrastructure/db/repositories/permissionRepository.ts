/**
 * MCP Proxy用の権限チェックサービス（簡易版）
 *
 * Week 3実装: 現在は基本的な権限チェックのみ
 * 将来的には organizationPermissions.ts と統合予定
 */

/**
 * MCPインスタンスへのアクセス権限をチェック
 *
 * @param userOrganizationId - ユーザーの組織ID
 * @param targetOrganizationId - アクセス対象の組織ID
 * @param resourceType - リソースタイプ（例: "MCP_SERVER_INSTANCE"）
 * @param action - アクション（例: "READ", "WRITE"）
 * @param resourceId - リソースID（例: インスタンスID）
 * @returns アクセス可能な場合はtrue
 *
 * TODO Week 3: Keycloak JWTのrolesを使った権限チェックを実装
 */
export const checkPermission = async (
  userOrganizationId: string,
  targetOrganizationId: string,
  resourceType: string,
  action: string,
  resourceId?: string,
): Promise<boolean> => {
  // 現在は同じ組織のみアクセス許可
  // Week 3で実装予定：
  // 1. MCPインスタンスが指定された組織に所属しているかDBチェック
  // 2. JWTのrolesに基づいて権限チェック（Owner/Admin/Member/Viewer）

  return userOrganizationId === targetOrganizationId;
};
