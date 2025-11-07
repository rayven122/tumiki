/**
 * 権限検証サービス
 *
 * 3層の権限管理を実装:
 * 1. ロールレベル - OrganizationRole → RolePermission
 * 2. グループレベル - OrganizationGroup → ResourceAccessControl
 * 3. メンバーレベル - OrganizationMember → ResourceAccessControl
 *
 * 権限チェックはRedisキャッシュで高速化（TTL: 5分）
 */

import { db } from "@tumiki/db/server";
import type { ResourceType, PermissionAction } from "@tumiki/db";
import { getRedisClient } from "../libs/cache/redis.js";
import { logDebug, logError, logInfo, logWarn } from "../libs/logger/index.js";

/**
 * リソースに対するアクセス権限をチェック
 *
 * @param userId - ユーザーID（DB主キー）
 * @param orgId - 組織ID
 * @param resourceType - リソースタイプ
 * @param action - 実行アクション
 * @param resourceId - リソースID（オプション、特定リソースの場合）
 * @returns 権限があればtrue
 */
export const checkPermission = async (
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction,
  resourceId?: string,
): Promise<boolean> => {
  // キャッシュキー
  const cacheKey = resourceId
    ? `permission:${userId}:${orgId}:${resourceType}:${resourceId}:${action}`
    : `permission:${userId}:${orgId}:${resourceType}:${action}`;

  // キャッシュ確認
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        logDebug("Permission cache hit", { cacheKey, result: cached });
        return cached === "1";
      }
    }
  } catch (error) {
    logError("Redis cache error", error as Error);
    // キャッシュエラー時はフォールスルー（DB直接アクセス）
  }

  // DB権限チェック
  const hasPermission = await checkPermissionFromDB(
    userId,
    orgId,
    resourceType,
    action,
    resourceId,
  );

  // キャッシュに保存（5分）
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(cacheKey, 300, hasPermission ? "1" : "0");
    }
  } catch (error) {
    logError("Redis cache save error", error as Error);
  }

  return hasPermission;
};

/**
 * DBから権限をチェック（実際のロジック）
 */
const checkPermissionFromDB = async (
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction,
  resourceId?: string,
): Promise<boolean> => {
  // 1. メンバーシップと基本情報を取得
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        userId,
        organizationId: orgId,
      },
    },
    include: {
      roles: {
        include: {
          permissions: true,
        },
      },
      groups: {
        include: {
          resourceAcls: true,
        },
      },
      resourceAcls: true,
    },
  });

  if (!member) {
    logWarn("User is not a member of organization", { userId, orgId });
    return false;
  }

  // 2. 組織管理者チェック → すべての権限
  if (member.isAdmin) {
    logDebug("User is org admin, granting permission", { userId, orgId });
    return true;
  }

  // 3. 特定リソースのアクセス制御チェック（拒否が優先）
  if (resourceId) {
    // メンバー個人への拒否
    const memberDeny = member.resourceAcls.find(
      (rac) =>
        rac.resourceType === resourceType &&
        rac.resourceId === resourceId &&
        rac.deniedActions.includes(action),
    );

    if (memberDeny) {
      logDebug("Permission denied by member-level access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return false;
    }

    // グループレベルの拒否
    for (const group of member.groups) {
      const groupDeny = group.resourceAcls.find(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.deniedActions.includes(action),
      );

      if (groupDeny) {
        logDebug("Permission denied by group-level access control", {
          userId,
          groupId: group.id,
          resourceType,
          resourceId,
          action,
        });
        return false;
      }
    }

    // メンバー個人への許可
    const memberAllow = member.resourceAcls.find(
      (rac) =>
        rac.resourceType === resourceType &&
        rac.resourceId === resourceId &&
        rac.allowedActions.includes(action),
    );

    if (memberAllow) {
      logDebug("Permission granted by member-level access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return true;
    }

    // グループレベルの許可
    for (const group of member.groups) {
      const groupAllow = group.resourceAcls.find(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.allowedActions.includes(action),
      );

      if (groupAllow) {
        logDebug("Permission granted by group-level access control", {
          userId,
          groupId: group.id,
          resourceType,
          resourceId,
          action,
        });
        return true;
      }
    }
  }

  // 4. ロールレベルの権限チェック
  for (const role of member.roles) {
    const rolePermission = role.permissions.find(
      (perm) => perm.resourceType === resourceType && perm.action === action,
    );

    if (rolePermission) {
      logDebug("Permission granted by role", {
        userId,
        roleId: role.id,
        roleName: role.name,
        resourceType,
        action,
      });
      return true;
    }

    // MANAGE権限は全アクションを含む
    const managePermission = role.permissions.find(
      (perm) => perm.resourceType === resourceType && perm.action === "MANAGE",
    );

    if (managePermission) {
      logDebug("Permission granted by MANAGE role", {
        userId,
        roleId: role.id,
        resourceType,
        action,
      });
      return true;
    }
  }

  // 5. デフォルト: 拒否
  logDebug("Permission denied (no matching rule)", {
    userId,
    orgId,
    resourceType,
    action,
    resourceId,
  });
  return false;
};

/**
 * 権限キャッシュを無効化
 *
 * 権限変更時に呼び出す。
 */
export const invalidatePermissionCache = async (
  userId: string,
  orgId: string,
): Promise<void> => {
  const pattern = `permission:${userId}:${orgId}:*`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping cache invalidation");
      return;
    }

    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      logInfo("Permission cache invalidated", {
        userId,
        orgId,
        keysDeleted: keys.length,
      });
    }
  } catch (error) {
    logError("Failed to invalidate permission cache", error as Error, {
      userId,
      orgId,
    });
  }
};

/**
 * 組織全体の権限キャッシュを無効化
 *
 * ロール変更時など、組織全体に影響する場合に使用。
 */
export const invalidateOrganizationCache = async (
  orgId: string,
): Promise<void> => {
  const pattern = `permission:*:${orgId}:*`;

  try {
    const redis = await getRedisClient();
    if (!redis) {
      logDebug("Redis not available, skipping cache invalidation");
      return;
    }

    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      logInfo("Organization permission cache invalidated", {
        orgId,
        keysDeleted: keys.length,
      });
    }
  } catch (error) {
    logError("Failed to invalidate organization cache", error as Error, {
      orgId,
    });
  }
};
