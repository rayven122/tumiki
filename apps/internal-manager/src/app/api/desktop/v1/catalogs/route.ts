import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { McpCatalogStatus, type PolicyEffect } from "@tumiki/internal-db";
import { db } from "@tumiki/internal-db/server";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";
import {
  evaluateCatalogPermissions,
  getPolicyContextForUser,
} from "~/server/mcp-policy/effective-permissions";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const TOOL_PREVIEW_LIMIT = 10;

const cursorSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

type Permissions = {
  read: boolean;
  write: boolean;
  execute: boolean;
};
type CatalogStatus = "available" | "request_required" | "disabled";
type CatalogCursor = z.infer<typeof cursorSchema>;

type ToolPreview = {
  id: string;
  name: string;
  description: string | null;
  orgUnitPermissions: {
    orgUnitId: string;
    effect: PolicyEffect;
    updatedAt: Date;
  }[];
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
  credentialKeys: string[];
  updatedAt: Date;
  tools: ToolPreview[];
};

const hasAnyPermission = (permissions: Permissions) =>
  permissions.read || permissions.write || permissions.execute;

const encodeCursor = (cursor: CatalogCursor) =>
  Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");

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

const toCatalogItem = (
  catalog: CatalogRow,
  permissions: Permissions,
  toolPermissions: Map<
    string,
    { allowed: boolean; deniedReason: string | null }
  >,
) => {
  const status: CatalogStatus =
    catalog.status !== McpCatalogStatus.ACTIVE
      ? "disabled"
      : hasAnyPermission(permissions)
        ? "available"
        : "request_required";

  return {
    id: catalog.slug,
    name: catalog.name,
    description: catalog.description ?? "",
    iconUrl: catalog.iconPath,
    status,
    permissions,
    transportType: catalog.transportType,
    authType: catalog.authType ?? "NONE",
    requiredCredentialKeys: catalog.credentialKeys,
    tools: catalog.tools.slice(0, TOOL_PREVIEW_LIMIT).map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      allowed:
        status === "available" &&
        (toolPermissions.get(tool.id)?.allowed ?? false),
      deniedReason: toolPermissions.get(tool.id)?.deniedReason ?? null,
    })),
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

  const policyContext = await getPolicyContextForUser(verifiedUser.userId);
  const policyUser = policyContext.user;
  if (!policyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        id: true,
        slug: true,
        name: true,
        description: true,
        iconPath: true,
        status: true,
        transportType: true,
        authType: true,
        credentialKeys: true,
        updatedAt: true,
        tools: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            updatedAt: true,
            orgUnitPermissions: {
              select: {
                orgUnitId: true,
                effect: true,
                updatedAt: true,
              },
            },
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
