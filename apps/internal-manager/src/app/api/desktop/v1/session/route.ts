import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ApprovalStatus } from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";
import { buildPolicyVersion } from "~/server/mcp-policy/effective-permissions";

export const GET = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, policyCatalogs] = await Promise.all([
    db.user.findUnique({
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
        orgUnitMemberships: {
          select: {
            isPrimary: true,
            updatedAt: true,
            orgUnit: {
              select: {
                id: true,
                name: true,
                externalId: true,
                source: true,
                path: true,
                parentId: true,
                lastSyncedAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
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
    }),
    db.mcpCatalog.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        slug: true,
        status: true,
        updatedAt: true,
        tools: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            defaultAllowed: true,
            updatedAt: true,
            orgUnitPermissions: {
              select: {
                orgUnitId: true,
                effect: true,
                updatedAt: true,
              },
              orderBy: [{ orgUnitId: "asc" }, { toolId: "asc" }],
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ slug: "asc" }, { id: "asc" }],
    }),
  ]);

  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const orgUnits = user.orgUnitMemberships.map((membership) => ({
    id: membership.orgUnit.id,
    name: membership.orgUnit.name,
    externalId: membership.orgUnit.externalId,
    source: membership.orgUnit.source,
    path: membership.orgUnit.path,
    parentId: membership.orgUnit.parentId,
    isPrimary: membership.isPrimary,
    lastSyncedAt: membership.orgUnit.lastSyncedAt?.toISOString() ?? null,
  }));

  const policyVersion = buildPolicyVersion({
    user: {
      id: user.id,
      role: user.role,
      updatedAt: user.updatedAt.toISOString(),
    },
    groups,
    orgUnits,
    catalogs: policyCatalogs,
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
      slug: null,
      name: null,
    },
    groups,
    orgUnits,
    permissions: [...groupPermissions, ...individualPermissions],
    features: {
      catalog: true,
      accessRequests: false,
      policySync: false,
      auditLogSync: true,
    },
    policyVersion,
  });
};

export const dynamic = "force-dynamic";
