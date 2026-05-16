import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { withDesktopAuth } from "~/lib/auth/with-desktop-auth";
import { buildOrgMemberWhere } from "~/lib/auth/org-member-where";
import { resolveMcpPermissions } from "~/lib/mcp/resolve-mcp-permissions";

/**
 * Desktop向けMCPサーバー設定配布エンドポイント
 * 認証済みユーザーの組織に登録されたMCPサーバー設定を返す
 * 認証情報（envVarの値）は含まない。
 */
export const GET = async (request: NextRequest) =>
  withDesktopAuth(request, async (verifiedUser) => {
    const member = await db.organizationMember.findFirst({
      where: buildOrgMemberWhere(verifiedUser.userId, verifiedUser.orgSlug),
      orderBy: { createdAt: "asc" },
      select: {
        organization: {
          select: {
            id: true,
            slug: true,
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
            mcpServers: {
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                iconPath: true,
                templateInstances: {
                  select: {
                    id: true,
                    normalizedName: true,
                    isEnabled: true,
                    mcpServerTemplate: {
                      select: {
                        transportType: true,
                        command: true,
                        args: true,
                        url: true,
                        authType: true,
                      },
                    },
                    allowedTools: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ mcpServers: [] });
    }

    const { organization } = member;
    // ロール未設定時は undefined → resolveMcpPermissions が全権限 false にフォールバックし、
    // 後段の execute フィルタで全サーバーが除外される
    const defaultRole = organization.roles[0];

    const mcpServers = organization.mcpServers
      .map((server) => {
        const permissions = resolveMcpPermissions(server.id, defaultRole);

        return {
          id: server.id,
          slug: server.slug,
          name: server.name,
          description: server.description,
          iconPath: server.iconPath,
          permissions,
          templateInstances: server.templateInstances.map((inst) => ({
            id: inst.id,
            normalizedName: inst.normalizedName,
            isEnabled: inst.isEnabled,
            transportType: inst.mcpServerTemplate.transportType,
            command: inst.mcpServerTemplate.command,
            args: inst.mcpServerTemplate.args,
            url: inst.mcpServerTemplate.url,
            authType: inst.mcpServerTemplate.authType,
            tools: inst.allowedTools.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          })),
        };
      })
      // execute 権限のないサーバーはクライアントに送らない（最小権限の原則）
      .filter((server) => server.permissions.execute);

    return NextResponse.json({ mcpServers });
  });
