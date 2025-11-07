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
 * Redis SCAN操作でキーを取得（KEYS操作の代替）
 *
 * 本番環境でのRedisブロッキングを回避するため、
 * KEYS操作ではなくSCAN操作を使用します。
 *
 * @param pattern - マッチパターン (例: "permission:*:org-id:*")
 * @param maxKeys - 最大取得キー数（デフォルト: 1000）
 * @returns マッチしたキーの配列
 */
const scanKeys = async (pattern: string, maxKeys = 1000): Promise<string[]> => {
  const redis = await getRedisClient();
  if (!redis) {
    return [];
  }

  const keys: string[] = [];
  let cursor = "0";
  let iterations = 0;
  const maxIterations = Math.ceil(maxKeys / 100);

  do {
    const result = await redis.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });
    cursor = result.cursor.toString();
    keys.push(...result.keys);
    iterations++;

    // 無限ループ防止とメモリ制限
    if (iterations >= maxIterations || keys.length >= maxKeys) {
      break;
    }
  } while (cursor !== "0");

  return keys;
};

const checkPermissionFromDB = async (
  userId: string,
  orgId: string,
  resourceType: ResourceType,
  action: PermissionAction,
  resourceId?: string,
): Promise<boolean> => {
  const member = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: { userId, organizationId: orgId },
    },
    include: {
      roles: { include: { permissions: true } },
      groups: { include: { resourceAcls: true } },
      resourceAcls: true,
    },
  });

  if (!member) {
    logWarn("User is not a member of organization", { userId, orgId });
    return false;
  }

  if (member.isAdmin) {
    logDebug("User is org admin, granting permission", { userId, orgId });
    return true;
  }

  if (resourceId) {
    // リソースレベル拒否チェック（メンバー + グループ）
    if (
      member.resourceAcls.some(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.deniedActions.includes(action),
      ) ||
      member.groups.some((g) =>
        g.resourceAcls.some(
          (rac) =>
            rac.resourceType === resourceType &&
            rac.resourceId === resourceId &&
            rac.deniedActions.includes(action),
        ),
      )
    ) {
      logDebug("Permission denied by resource access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return false;
    }

    // リソースレベル許可チェック（メンバー + グループ）
    if (
      member.resourceAcls.some(
        (rac) =>
          rac.resourceType === resourceType &&
          rac.resourceId === resourceId &&
          rac.allowedActions.includes(action),
      ) ||
      member.groups.some((g) =>
        g.resourceAcls.some(
          (rac) =>
            rac.resourceType === resourceType &&
            rac.resourceId === resourceId &&
            rac.allowedActions.includes(action),
        ),
      )
    ) {
      logDebug("Permission granted by resource access control", {
        userId,
        resourceType,
        resourceId,
        action,
      });
      return true;
    }
  }

  // ロールレベル権限チェック（直接 or MANAGE）
  if (
    member.roles.some((role) =>
      role.permissions.some(
        (perm) =>
          perm.resourceType === resourceType &&
          (perm.action === action || perm.action === "MANAGE"),
      ),
    )
  ) {
    logDebug("Permission granted by role", {
      userId,
      resourceType,
      action,
    });
    return true;
  }

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

    // SCAN操作を使用（本番環境でのブロッキング回避）
    const keys = await scanKeys(pattern);

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

    // SCAN操作を使用（本番環境でのブロッキング回避）
    const keys = await scanKeys(pattern);

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
