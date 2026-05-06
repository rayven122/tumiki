import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { McpCatalogStatus, type PolicyEffect } from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";
import {
  evaluateCatalogPermissions,
  getPolicyContextForUser,
  type DeniedReason,
  type PermissionBits,
} from "~/server/mcp-policy/effective-permissions";
import {
  NO_GROUP_PERMISSION_ID,
  NO_ORG_UNIT_PERMISSION_ID,
} from "~/server/mcp-policy/constants";
import { buildCatalogPolicySelect } from "~/server/mcp-policy/catalog-policy-query";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const TOOL_PREVIEW_LIMIT = 10;
const CATALOG_TOOL_LIMIT = 500;

const cursorSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

type CatalogStatus = "available" | "disabled";
type CatalogCursor = z.infer<typeof cursorSchema>;

type PermissionRow = {
  effect: PolicyEffect;
  updatedAt: Date;
};

type UserPermissionRow = { userId: string } & PermissionRow & {
    reason: string | null;
    expiresAt: Date | null;
  };

type ToolPreview = {
  id: string;
  name: string;
  description: string | null;
  defaultAllowed: boolean;
  orgUnitPermissions: {
    orgUnitId: string;
    effect: PolicyEffect;
    updatedAt: Date;
  }[];
  groupPermissions: ({ groupId: string } & PermissionRow)[];
  userPermissions: UserPermissionRow[];
  updatedAt: Date;
};

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconPath: string | null;
  status: McpCatalogStatus;
  transportType: string;
  authType: string;
  command: string | null;
  args: string[];
  url: string | null;
  credentialKeys: string[];
  updatedAt: Date;
  orgUnitCatalogPermissions: ({ orgUnitId: string } & PermissionRow)[];
  groupCatalogPermissions: ({ groupId: string } & PermissionRow)[];
  userCatalogPermissions: UserPermissionRow[];
  tools: ToolPreview[];
};

const encodeCursor = (cursor: CatalogCursor) =>
  Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");

const hasAnyPermission = (permissions: PermissionBits) =>
  permissions.read || permissions.execute;

const decodeCursor = (cursor: string): CatalogCursor | null => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    const result = cursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const toConnectionTemplate = (catalog: CatalogRow) => {
  return {
    transportType: catalog.transportType,
    command: catalog.command,
    args: catalog.args,
    url: catalog.url,
    authType: catalog.authType,
    credentialKeys: catalog.credentialKeys,
  };
};

const toCatalogItem = (
  catalog: CatalogRow,
  permissions: PermissionBits,
  toolPermissions: Map<
    string,
    { allowed: boolean; deniedReason: DeniedReason | null }
  >,
) => {
  const catalogDisabled = catalog.status !== McpCatalogStatus.ACTIVE;
  const status: CatalogStatus =
    !catalogDisabled && hasAnyPermission(permissions)
      ? "available"
      : "disabled";

  return {
    id: catalog.slug,
    name: catalog.name,
    description: catalog.description ?? "",
    iconUrl: catalog.iconPath,
    status,
    permissions,
    transportType: catalog.transportType,
    authType: catalog.authType,
    requiredCredentialKeys: catalog.credentialKeys,
    connectionTemplate: toConnectionTemplate(catalog),
    tools: catalog.tools.slice(0, TOOL_PREVIEW_LIMIT).map((tool) => {
      const toolPermission = toolPermissions.get(tool.id);
      return {
        name: tool.name,
        description: tool.description ?? "",
        allowed: !catalogDisabled && (toolPermission?.allowed ?? false),
        deniedReason: catalogDisabled
          ? "catalog_disabled"
          : (toolPermission?.deniedReason ?? null),
      };
    }),
  };
};

export const GET = async (request: NextRequest) => {
  let verifiedUser: Awaited<ReturnType<typeof verifyDesktopJwt>>;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const decodedCursor = parsedQuery.data.cursor
    ? decodeCursor(parsedQuery.data.cursor)
    : null;
  if (parsedQuery.data.cursor && !decodedCursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  let policyContext: Awaited<ReturnType<typeof getPolicyContextForUser>>;
  try {
    policyContext = await getPolicyContextForUser(verifiedUser.userId);
  } catch (error) {
    console.error("Failed to fetch desktop MCP policy context", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
  const policyUser = policyContext.user;
  if (!policyUser?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groupIds = policyUser.groupMemberships.map(
    (membership) => membership.group.id,
  );
  const orgUnitIds = policyContext.orgUnits.map((orgUnit) => orgUnit.id);
  const now = new Date();
  // Prisma の in: [] は provider 差分を避けるため、未所属時は存在しないIDで空結果を強制する。
  const orgUnitPermissionIds =
    orgUnitIds.length > 0 ? orgUnitIds : [NO_ORG_UNIT_PERMISSION_ID];
  const groupPermissionIds =
    groupIds.length > 0 ? groupIds : [NO_GROUP_PERMISSION_ID];
  const policySelect = buildCatalogPolicySelect({
    userId: policyUser.id,
    groupPermissionIds,
    orgUnitPermissionIds,
    now,
    toolTake: CATALOG_TOOL_LIMIT + 1,
  });

  let catalogs: CatalogRow[];
  try {
    catalogs = await db.mcpCatalog.findMany({
      where: {
        deletedAt: null,
        ...(decodedCursor
          ? {
              OR: [
                { name: { gt: decodedCursor.name } },
                { name: decodedCursor.name, id: { gt: decodedCursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: parsedQuery.data.limit + 1,
      select: {
        ...policySelect,
        name: true,
        description: true,
        iconPath: true,
        transportType: true,
        authType: true,
        command: true,
        args: true,
        url: true,
        credentialKeys: true,
        tools: {
          ...policySelect.tools,
          select: {
            ...policySelect.tools.select,
            description: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch desktop MCP catalogs", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (catalogs.some((catalog) => catalog.tools.length > CATALOG_TOOL_LIMIT)) {
    console.error("Desktop MCP catalog tool count exceeded limit");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  const pageItems = catalogs.slice(0, parsedQuery.data.limit);
  const hasNextPage = catalogs.length > parsedQuery.data.limit;
  const lastPageItem = pageItems.at(-1);

  return NextResponse.json({
    items: pageItems.map((catalog) => {
      const effective = evaluateCatalogPermissions(
        policyUser,
        catalog,
        policyContext.orgUnits,
      );
      return toCatalogItem(catalog, effective.permissions, effective.tools);
    }),
    nextCursor:
      hasNextPage && lastPageItem
        ? encodeCursor({ id: lastPageItem.id, name: lastPageItem.name })
        : null,
  });
};

export const dynamic = "force-dynamic";
