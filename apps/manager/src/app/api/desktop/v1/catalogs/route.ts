import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { withDesktopAuth } from "~/lib/auth/with-desktop-auth";
import { buildOrgMemberWhere } from "~/lib/auth/org-member-where";
import { resolveMcpPermissions } from "~/lib/mcp/resolve-mcp-permissions";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 200;
const PENDING_SERVER_STATUS = "PENDING";

const toPositiveLimit = (value: string | null): number => {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const toDesktopTransportType = (
  transportType: "STDIO" | "SSE" | "STREAMABLE_HTTPS",
): "STDIO" | "SSE" | "STREAMABLE_HTTP" =>
  transportType === "STREAMABLE_HTTPS" ? "STREAMABLE_HTTP" : transportType;

/**
 * Desktop の既存 catalog API 形式で、組織に配布済みの MCP サーバーを返す。
 *
 * Desktop 側は `connectionTemplate.credentialKeys` を既に持っているため、
 * manager の `envVarKeys` はここで catalog の credentialKeys に変換する。
 */
export const GET = async (request: NextRequest) =>
  withDesktopAuth(request, async (verifiedUser) => {
    const limit = toPositiveLimit(request.nextUrl.searchParams.get("limit"));
    const cursor = request.nextUrl.searchParams.get("cursor");

    const member = await db.organizationMember.findFirst({
      where: buildOrgMemberWhere(verifiedUser.userId, verifiedUser.orgSlug),
      orderBy: { createdAt: "asc" },
      select: {
        organization: {
          select: {
            id: true,
            roles: {
              where: { isDefault: true },
              take: 1,
              select: {
                defaultRead: true,
                defaultWrite: true,
                defaultExecute: true,
                mcpPermissions: {
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
      },
    });

    if (!member) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const servers = await db.mcpServer.findMany({
      where: {
        organizationId: member.organization.id,
        deletedAt: null,
        serverStatus: { not: PENDING_SERVER_STATUS },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconPath: true,
        templateInstances: {
          orderBy: [{ displayOrder: "asc" }, { updatedAt: "asc" }],
          select: {
            isEnabled: true,
            mcpServerTemplate: {
              select: {
                transportType: true,
                command: true,
                args: true,
                url: true,
                envVarKeys: true,
                authType: true,
              },
            },
            allowedTools: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = servers.length > limit;
    const pageServers = hasNextPage ? servers.slice(0, limit) : servers;
    const defaultRole = member.organization.roles[0];

    const items = pageServers.flatMap((server) => {
      const primaryInstance =
        server.templateInstances.find((inst) => inst.isEnabled) ??
        server.templateInstances[0];
      if (!primaryInstance) return [];

      const permissions = resolveMcpPermissions(server.id, defaultRole);
      const template = primaryInstance.mcpServerTemplate;
      const transportType = toDesktopTransportType(template.transportType);

      return [
        {
          id: server.id,
          name: server.name,
          description: server.description,
          iconUrl: server.iconPath,
          status: permissions.execute ? "available" : "disabled",
          permissions,
          transportType,
          authType: template.authType,
          requiredCredentialKeys: template.envVarKeys,
          tools: primaryInstance.allowedTools.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            allowed: true,
          })),
          connectionTemplate: {
            transportType,
            command: template.command,
            args: template.args,
            url: template.url,
            authType: template.authType,
            credentialKeys: template.envVarKeys,
          },
        },
      ];
    });

    return NextResponse.json({
      items,
      nextCursor: hasNextPage ? (pageServers.at(-1)?.id ?? null) : null,
    });
  });
