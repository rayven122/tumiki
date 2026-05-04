import { z } from "zod";
import { requestManagerApi } from "../../shared/manager-api-client";

export const desktopSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    sub: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string(),
  }),
  organization: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable().default(null),
    name: z.string().nullable(),
    logoUrl: z.string().nullable().default(null),
  }),
  groups: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      source: z.string(),
      provider: z.string().nullable(),
      externalId: z.string().nullable(),
      membershipSource: z.string(),
      lastSyncedAt: z.string().nullable(),
    }),
  ),
  orgUnits: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      externalId: z.string().nullable(),
      source: z.string(),
      path: z.string().nullable(),
      parentId: z.string().nullable(),
      isPrimary: z.boolean(),
      lastSyncedAt: z.string().nullable(),
    }),
  ),
  permissions: z.array(
    z.object({
      source: z.enum(["GROUP", "INDIVIDUAL"]),
      groupId: z.string().optional(),
      mcpServerId: z.string(),
      read: z.boolean(),
      write: z.boolean(),
      execute: z.boolean(),
      reason: z.string().optional(),
      approvedAt: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    }),
  ),
  features: z.object({
    catalog: z.boolean(),
    accessRequests: z.boolean(),
    policySync: z.boolean(),
    auditLogSync: z.boolean(),
  }),
  policyVersion: z.string(),
});

export const getDesktopSession = async () => {
  const response = await requestManagerApi("/api/desktop/v1/session", {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response) return null;

  if (response.status === 401) {
    throw new Error("管理サーバーへの再ログインが必要です");
  }
  if (!response.ok) {
    throw new Error(
      `Desktopセッションの取得に失敗しました（${response.status}）`,
    );
  }

  const data: unknown = await response.json();
  const result = desktopSessionSchema.safeParse(data);
  if (!result.success) {
    throw new Error("管理サーバーからの応答フォーマットが不正です");
  }
  return result.data;
};
