import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";
import {
  DESKTOP_API_SETTINGS_DEFAULTS,
  DESKTOP_API_SETTINGS_ID,
} from "~/lib/desktop-api-settings/constants";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";
import {
  buildPolicyVersion,
  getPolicyOrgUnitsForMemberships,
} from "~/server/mcp-policy/effective-permissions";

const POLICY_VERSION_CATALOG_LIMIT = 500;
const NO_ORG_UNIT_PERMISSION_ID = "__NO_ORG_UNIT_PERMISSION__";
const NO_GROUP_PERMISSION_ID = "__NO_GROUP_PERMISSION__";

export const GET = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
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
                catalogPermissions: {
                  select: {
                    catalogId: true,
                    effect: true,
                    updatedAt: true,
                  },
                  orderBy: [{ catalogId: "asc" }],
                },
                catalogToolPermissions: {
                  select: {
                    catalogId: true,
                    toolId: true,
                    effect: true,
                    updatedAt: true,
                  },
                  orderBy: [{ catalogId: "asc" }, { toolId: "asc" }],
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
        catalogPermissions: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            catalogId: true,
            effect: true,
            reason: true,
            expiresAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        catalogToolPermissions: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            catalogId: true,
            toolId: true,
            effect: true,
            reason: true,
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

    const groupIds = user.groupMemberships.map(
      (membership) => membership.group.id,
    );
    const groupPermissionIds =
      groupIds.length > 0 ? groupIds : [NO_GROUP_PERMISSION_ID];
    const policyOrgUnits = await getPolicyOrgUnitsForMemberships(
      user.orgUnitMemberships,
      db,
    );
    const orgUnitIds = policyOrgUnits.map((orgUnit) => orgUnit.id);
    const orgUnitPermissionIds =
      orgUnitIds.length > 0 ? orgUnitIds : [NO_ORG_UNIT_PERMISSION_ID];
    const [policyCatalogs, settings] = await Promise.all([
      db.mcpCatalog.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          slug: true,
          status: true,
          updatedAt: true,
          orgUnitCatalogPermissions: {
            where: { orgUnitId: { in: orgUnitPermissionIds } },
            select: {
              orgUnitId: true,
              effect: true,
              updatedAt: true,
            },
            orderBy: [{ orgUnitId: "asc" }],
          },
          groupCatalogPermissions: {
            where: { groupId: { in: groupPermissionIds } },
            select: {
              groupId: true,
              effect: true,
              updatedAt: true,
            },
            orderBy: [{ groupId: "asc" }],
          },
          userCatalogPermissions: {
            where: {
              userId: verifiedUser.userId,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            select: {
              userId: true,
              effect: true,
              updatedAt: true,
            },
            orderBy: [{ userId: "asc" }],
          },
          tools: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              defaultAllowed: true,
              updatedAt: true,
              orgUnitPermissions: {
                where: { orgUnitId: { in: orgUnitPermissionIds } },
                select: {
                  orgUnitId: true,
                  effect: true,
                  updatedAt: true,
                },
                orderBy: [{ orgUnitId: "asc" }],
              },
              groupPermissions: {
                where: { groupId: { in: groupPermissionIds } },
                select: {
                  groupId: true,
                  effect: true,
                  updatedAt: true,
                },
                orderBy: [{ groupId: "asc" }],
              },
              userPermissions: {
                where: {
                  userId: verifiedUser.userId,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                select: {
                  userId: true,
                  effect: true,
                  updatedAt: true,
                },
                orderBy: [{ userId: "asc" }],
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: [{ slug: "asc" }, { id: "asc" }],
        take: POLICY_VERSION_CATALOG_LIMIT + 1,
      }),
      db.desktopApiSettings.findUnique({
        where: { id: DESKTOP_API_SETTINGS_ID },
        select: {
          organizationName: true,
          organizationLogoUrl: true,
        },
      }),
    ]);

    if (policyCatalogs.length > POLICY_VERSION_CATALOG_LIMIT) {
      console.error(
        `MCP catalog count exceeded the session policy limit (${POLICY_VERSION_CATALOG_LIMIT}); refusing incomplete policyVersion.`,
      );
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }

    const desktopApiSettings = settings ?? DESKTOP_API_SETTINGS_DEFAULTS;

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

    const groupCatalogPermissions = user.groupMemberships.flatMap(
      (membership) =>
        membership.group.catalogPermissions.map((permission) => ({
          source: "GROUP" as const,
          scope: "CATALOG" as const,
          groupId: membership.group.id,
          catalogId: permission.catalogId,
          effect: permission.effect,
        })),
    );

    const groupToolPermissions = user.groupMemberships.flatMap((membership) =>
      membership.group.catalogToolPermissions.map((permission) => ({
        source: "GROUP" as const,
        scope: "TOOL" as const,
        groupId: membership.group.id,
        catalogId: permission.catalogId,
        toolId: permission.toolId,
        effect: permission.effect,
      })),
    );

    const orgUnitCatalogPermissions = policyCatalogs.flatMap((catalog) =>
      catalog.orgUnitCatalogPermissions.map((permission) => ({
        source: "ORG_UNIT" as const,
        scope: "CATALOG" as const,
        orgUnitId: permission.orgUnitId,
        catalogId: catalog.id,
        effect: permission.effect,
      })),
    );
    const orgUnitToolPermissions = policyCatalogs.flatMap((catalog) =>
      catalog.tools.flatMap((tool) =>
        tool.orgUnitPermissions.map((permission) => ({
          source: "ORG_UNIT" as const,
          scope: "TOOL" as const,
          orgUnitId: permission.orgUnitId,
          catalogId: catalog.id,
          toolId: tool.id,
          effect: permission.effect,
        })),
      ),
    );
    const userCatalogPermissions = user.catalogPermissions.map(
      (permission) => ({
        source: "USER" as const,
        scope: "CATALOG" as const,
        catalogId: permission.catalogId,
        effect: permission.effect,
        reason: permission.reason,
        expiresAt: permission.expiresAt?.toISOString() ?? null,
      }),
    );
    const userToolPermissions = user.catalogToolPermissions.map(
      (permission) => ({
        source: "USER" as const,
        scope: "TOOL" as const,
        catalogId: permission.catalogId,
        toolId: permission.toolId,
        effect: permission.effect,
        reason: permission.reason,
        expiresAt: permission.expiresAt?.toISOString() ?? null,
      }),
    );
    const permissions = [
      ...orgUnitCatalogPermissions,
      ...orgUnitToolPermissions,
      ...groupCatalogPermissions,
      ...groupToolPermissions,
      ...userCatalogPermissions,
      ...userToolPermissions,
    ];

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
      settings: {
        organizationName: desktopApiSettings.organizationName,
        organizationLogoUrl: desktopApiSettings.organizationLogoUrl,
      },
      groups,
      orgUnits,
      catalogs: policyCatalogs,
      permissions,
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
        name: desktopApiSettings.organizationName,
        logoUrl: desktopApiSettings.organizationLogoUrl,
      },
      groups,
      orgUnits,
      permissions,
      features: {
        catalog: true,
        accessRequests: false,
        policySync: true,
        auditLogSync: true,
      },
      policyVersion,
    });
  } catch (error) {
    console.error("Failed to fetch desktop session", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};

export const dynamic = "force-dynamic";
