import { z } from "zod";
import {
  OrganizationSchema,
  UserSchema,
  OrganizationMemberSchema,
  OrganizationInvitationSchema,
} from "@tumiki/db/zod";

/**
 * 組織の基本出力スキーマ
 */
export const baseOrganizationOutput = OrganizationSchema.pick({
  id: true,
  name: true,
  description: true,
  logoUrl: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

/**
 * メンバー情報を含む組織出力スキーマ
 * Note: isAdminフィールドは削除（JWTのrolesで判定）
 */
export const organizationWithMembersOutput = baseOrganizationOutput.extend({
  members: z.array(
    OrganizationMemberSchema.pick({
      id: true,
      userId: true,
      createdAt: true,
    }).extend({
      user: UserSchema.pick({
        id: true,
        name: true,
        email: true,
        image: true,
      }),
      roles: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      ),
    }),
  ),
  _count: z.object({
    members: z.number(),
  }),
});

/**
 * 完全な組織詳細の出力スキーマ
 */
export const fullOrganizationOutput = organizationWithMembersOutput.extend({
  creator: UserSchema.pick({
    id: true,
    name: true,
    email: true,
  }),
  invitations: z.array(
    OrganizationInvitationSchema.pick({
      id: true,
      email: true,
      expires: true,
    }).extend({
      invitedByUser: UserSchema.pick({
        id: true,
        name: true,
      }),
    }),
  ),
  _count: z.object({
    members: z.number(),
    groups: z.number(),
    roles: z.number(),
  }),
});

/**
 * 使用量統計の出力スキーマ
 */
export const usageStatsOutput = z.object({
  totalRequests: z.number(),
  uniqueUsers: z.number(),
  memberStats: z.array(
    z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        image: z.string().nullable(),
      }),
      requestCount: z.number(),
      lastActivity: z.number().nullable(),
    }),
  ),
  dailyStats: z.array(
    z.object({
      date: z.string(),
      requests: z.number(),
    }),
  ),
});

/**
 * 組織更新入力スキーマ
 */
export const updateOrganizationInput = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
});

/**
 * メンバー招待入力スキーマ
 * Note: isAdminフィールドは削除（代わりにrolesで指定）
 */
export const inviteMemberInput = z.object({
  email: z.string().email(),
  roles: z.array(z.string()).default(["Member"]), // Keycloakロール配列
  roleIds: z.array(z.string()).default([]), // 後方互換性のため残す（非推奨）
  groupIds: z.array(z.string()).default([]), // 後方互換性のため残す（非推奨）
});

/**
 * メンバー削除入力スキーマ
 */
export const removeMemberInput = z.object({
  memberId: z.string(),
});
