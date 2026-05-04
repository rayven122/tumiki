import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db as internalDb } from "@tumiki/internal-db/server";
import { verifyDesktopJwt } from "~/lib/auth/verify-desktop-jwt";

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

type PermissionRow = {
  mcpServerId: string;
  read: boolean;
  write: boolean;
  execute: boolean;
};

type ToolPreview = {
  id?: string;
  name: string;
  description: string;
  isAllowed?: boolean;
  reviewStatus?: string;
};

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconPath: string | null;
  serverStatus: string;
  authType: string;
  connections?: {
    id: string;
    isEnabled: boolean;
    transportType: string;
    command: string | null;
    args: string[];
    url: string | null;
    credentialKeys: string[];
    authType: string;
    catalog: {
      transportType: string;
      command: string | null;
      args: string[];
      url: string | null;
      credentialKeys: string[];
      authType: string;
    } | null;
    tools: ToolPreview[];
  }[];
  templateInstances: {
    isEnabled: boolean;
    allowedTools: ToolPreview[];
    mcpServerTemplate: {
      transportType: string;
      authType: string;
      command: string | null;
      args: string[];
      url: string | null;
      envVarKeys: string[];
      mcpTools: ToolPreview[];
    };
  }[];
};

type ToolPermissionContext = {
  userPermissions: Map<string, boolean>;
  groupPermissions: Map<string, boolean[]>;
};

const emptyPermissions = (): Permissions => ({
  read: false,
  write: false,
  execute: false,
});

const getCatalogDb = async () => {
  const { db } = await import("@tumiki/db/server");
  return db;
};

const mergePermission = (
  map: Map<string, Permissions>,
  permission: PermissionRow,
) => {
  const current = map.get(permission.mcpServerId) ?? emptyPermissions();
  map.set(permission.mcpServerId, {
    read: current.read || permission.read,
    write: current.write || permission.write,
    execute: current.execute || permission.execute,
  });
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

const mapTransportType = (transportType: string | undefined) =>
  transportType === "STREAMABLE_HTTPS" ? "STREAMABLE_HTTP" : transportType;

const mapAuthType = (authType: string | undefined) =>
  authType === "API_KEY" ? "API_KEY" : authType;

const getEffectivePermissions = async (userId: string) => {
  const now = new Date();
  const user = await internalDb.user.findUnique({
    where: { id: userId },
    select: {
      groupMemberships: {
        select: {
          groupId: true,
          group: {
            select: {
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
      },
      individualPermissions: {
        where: {
          status: "APPROVED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          mcpServerId: true,
        },
      },
      mcpToolPermissions: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: {
          mcpToolId: true,
          canUse: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  const permissionMap = new Map<string, Permissions>();
  for (const membership of user.groupMemberships) {
    for (const permission of membership.group.permissions) {
      mergePermission(permissionMap, permission);
    }
  }
  for (const permission of user.individualPermissions) {
    mergePermission(permissionMap, {
      mcpServerId: permission.mcpServerId,
      read: true,
      write: true,
      execute: true,
    });
  }

  const groupIds = user.groupMemberships.map(
    (membership) => membership.groupId,
  );
  const groupToolPermissions =
    groupIds.length === 0
      ? []
      : await internalDb.groupMcpToolPermission.findMany({
          where: { groupId: { in: groupIds } },
          select: {
            mcpToolId: true,
            canUse: true,
          },
        });

  const toolPermissionContext: ToolPermissionContext = {
    userPermissions: new Map(
      user.mcpToolPermissions.map((permission) => [
        permission.mcpToolId,
        permission.canUse,
      ]),
    ),
    groupPermissions: new Map(),
  };

  for (const permission of groupToolPermissions) {
    const current =
      toolPermissionContext.groupPermissions.get(permission.mcpToolId) ?? [];
    current.push(permission.canUse);
    toolPermissionContext.groupPermissions.set(permission.mcpToolId, current);
  }

  return { permissionMap, toolPermissionContext };
};

const canUseTool = (
  tool: ToolPreview,
  toolPermissionContext: ToolPermissionContext,
) => {
  if (!tool.id) return true;
  if (!tool.isAllowed) return false;
  const userPermission = toolPermissionContext.userPermissions.get(tool.id);
  if (userPermission !== undefined) return userPermission;
  return (
    toolPermissionContext.groupPermissions.get(tool.id)?.some(Boolean) ?? false
  );
};

const toCatalogItem = (
  catalog: CatalogRow,
  permissions: Permissions,
  toolPermissionContext: ToolPermissionContext,
) => {
  const firstConnection = catalog.connections?.[0];
  const firstInstance = catalog.templateInstances[0];
  const template = firstInstance?.mcpServerTemplate;
  const connectionCatalog = firstConnection?.catalog;
  const tools = firstConnection
    ? firstConnection.tools
    : (firstInstance?.allowedTools.length ?? 0) !== 0
      ? (firstInstance?.allowedTools ?? [])
      : (template?.mcpTools ?? []);
  const hasUsableTool =
    !firstConnection ||
    tools.some((tool) => canUseTool(tool, toolPermissionContext));
  const status: CatalogStatus =
    catalog.serverStatus !== "RUNNING" || !hasUsableTool
      ? "disabled"
      : hasAnyPermission(permissions)
        ? "available"
        : "request_required";

  const transportType =
    mapTransportType(
      firstConnection?.transportType ??
        connectionCatalog?.transportType ??
        template?.transportType,
    ) ?? "STDIO";
  const authType =
    mapAuthType(
      firstConnection?.authType ??
        connectionCatalog?.authType ??
        template?.authType ??
        catalog.authType,
    ) ?? "NONE";
  const credentialKeys =
    firstConnection?.credentialKeys ??
    connectionCatalog?.credentialKeys ??
    template?.envVarKeys ??
    [];

  return {
    id: catalog.slug,
    name: catalog.name,
    description: catalog.description,
    iconUrl: catalog.iconPath,
    status,
    permissions,
    transportType,
    authType,
    requiredCredentialKeys: credentialKeys,
    connectionTemplate: {
      transportType,
      command:
        firstConnection?.command ??
        connectionCatalog?.command ??
        template?.command ??
        null,
      args:
        firstConnection?.args ??
        connectionCatalog?.args ??
        template?.args ??
        [],
      url:
        firstConnection?.url ?? connectionCatalog?.url ?? template?.url ?? null,
      authType,
      credentialKeys,
    },
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      allowed:
        status === "available" &&
        permissions.execute &&
        (firstConnection?.isEnabled ?? firstInstance?.isEnabled ?? true) &&
        canUseTool(tool, toolPermissionContext),
      reviewStatus: tool.reviewStatus,
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

  let permissionMap: Map<string, Permissions>;
  let toolPermissionContext: ToolPermissionContext;
  try {
    const effectivePermissions = await getEffectivePermissions(
      verifiedUser.userId,
    );
    permissionMap = effectivePermissions.permissionMap;
    toolPermissionContext = effectivePermissions.toolPermissionContext;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const catalogDb = await getCatalogDb();
  const catalogs = await catalogDb.mcpServer.findMany({
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
      serverStatus: true,
      authType: true,
      connections: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        take: 1,
        select: {
          id: true,
          isEnabled: true,
          transportType: true,
          command: true,
          args: true,
          url: true,
          credentialKeys: true,
          authType: true,
          catalog: {
            select: {
              transportType: true,
              command: true,
              args: true,
              url: true,
              credentialKeys: true,
              authType: true,
            },
          },
          tools: {
            orderBy: { name: "asc" },
            take: TOOL_PREVIEW_LIMIT,
            select: {
              id: true,
              name: true,
              description: true,
              isAllowed: true,
              reviewStatus: true,
            },
          },
        },
      },
      templateInstances: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        take: 1,
        select: {
          isEnabled: true,
          allowedTools: {
            orderBy: { name: "asc" },
            take: TOOL_PREVIEW_LIMIT,
            select: {
              name: true,
              description: true,
            },
          },
          mcpServerTemplate: {
            select: {
              transportType: true,
              authType: true,
              command: true,
              args: true,
              url: true,
              envVarKeys: true,
              mcpTools: {
                orderBy: { name: "asc" },
                take: TOOL_PREVIEW_LIMIT,
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const pageItems = catalogs.slice(0, parsedQuery.data.limit);
  const hasNextPage = catalogs.length > parsedQuery.data.limit;
  const lastPageItem = pageItems.at(-1);

  return NextResponse.json({
    items: pageItems.map((catalog) =>
      toCatalogItem(
        catalog,
        permissionMap.get(catalog.id) ?? emptyPermissions(),
        toolPermissionContext,
      ),
    ),
    nextCursor:
      hasNextPage && lastPageItem
        ? encodeCursor({ id: lastPageItem.id, name: lastPageItem.name })
        : null,
  });
};

export const dynamic = "force-dynamic";
