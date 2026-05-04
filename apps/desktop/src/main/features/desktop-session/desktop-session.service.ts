import { z } from "zod";
import { requestManagerApi } from "../../shared/manager-api-client";

const desktopSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    sub: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string(),
  }),
  organization: z.object({
    id: z.string().nullable(),
    slug: z.string().nullable(),
    name: z.string().nullable(),
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
    throw new Error("管理サーバーへのサインインが必要です");
  }
  if (!response.ok) {
    throw new Error(
      `Desktopセッションの取得に失敗しました（${response.status}）`,
    );
  }

  const data: unknown = await response.json();
  return desktopSessionSchema.parse(data);
};
