import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ApprovalStatus } from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";
import { DESKTOP_API_SETTINGS_ID } from "~/lib/desktop-api-settings/constants";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";

const buildPolicyVersion = (policyState: unknown): string =>
  `pol_v1_${createHash("sha256")
    .update(JSON.stringify(policyState))
    .digest("base64url")
    .slice(0, 32)}`;

export const GET = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: verifiedUser.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
      groupMemberships: {
        select: {
          source: true,
          createdAt: true,
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              source: true,
              provider: true,
              externalId: true,
              lastSyncedAt: true,
              updatedAt: true,
              permissions: {
                select: {
                  mcpServerId: true,
                  read: true,
                  write: true,
                  execute: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      individualPermissions: {
        where: {
          status: ApprovalStatus.APPROVED,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          mcpServerId: true,
          reason: true,
          approvedAt: true,
          expiresAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.desktopApiSettings.findUnique({
    where: { id: DESKTOP_API_SETTINGS_ID },
    select: {
      organizationName: true,
      organizationSlug: true,
      catalogEnabled: true,
      accessRequestsEnabled: true,
      policySyncEnabled: true,
      auditLogSyncEnabled: true,
    },
  });

  const groups = user.groupMemberships.map((membership) => ({
    id: membership.group.id,
    name: membership.group.name,
    description: membership.group.description,
    source: membership.group.source,
    provider: membership.group.provider,
    externalId: membership.group.externalId,
    membershipSource: membership.source,
    lastSyncedAt: membership.group.lastSyncedAt?.toISOString() ?? null,
  }));

  const groupPermissions = user.groupMemberships.flatMap((membership) =>
    membership.group.permissions.map((permission) => ({
      source: "GROUP" as const,
      groupId: membership.group.id,
      mcpServerId: permission.mcpServerId,
      read: permission.read,
      write: permission.write,
      execute: permission.execute,
    })),
  );

  const individualPermissions = user.individualPermissions.map(
    (permission) => ({
      source: "INDIVIDUAL" as const,
      mcpServerId: permission.mcpServerId,
      read: true,
      write: true,
      execute: true,
      reason: permission.reason,
      approvedAt: permission.approvedAt?.toISOString() ?? null,
      expiresAt: permission.expiresAt?.toISOString() ?? null,
    }),
  );

  const policyVersion = buildPolicyVersion({
    user: {
      id: user.id,
      role: user.role,
      updatedAt: user.updatedAt.toISOString(),
    },
    settings: {
      organizationName: settings?.organizationName ?? null,
      organizationSlug: settings?.organizationSlug ?? null,
      catalogEnabled: settings?.catalogEnabled ?? false,
      accessRequestsEnabled: settings?.accessRequestsEnabled ?? false,
      policySyncEnabled: settings?.policySyncEnabled ?? false,
      auditLogSyncEnabled: settings?.auditLogSyncEnabled ?? true,
    },
    groups,
    permissions: [...groupPermissions, ...individualPermissions],
  });

  return NextResponse.json({
    user: {
      id: user.id,
      sub: verifiedUser.sub,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    organization: {
      id: null,
      slug: settings?.organizationSlug ?? null,
      name: settings?.organizationName ?? null,
    },
    groups,
    permissions: [...groupPermissions, ...individualPermissions],
    features: {
      catalog: settings?.catalogEnabled ?? false,
      accessRequests: settings?.accessRequestsEnabled ?? false,
      policySync: settings?.policySyncEnabled ?? false,
      auditLogSync: settings?.auditLogSyncEnabled ?? true,
    },
    policyVersion,
  });
};

export const dynamic = "force-dynamic";
