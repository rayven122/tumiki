import { createHash } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { withDesktopAuth } from "~/lib/auth/with-desktop-auth";
import { buildOrgMemberWhere } from "~/lib/auth/org-member-where";
import { resolveMcpPermissions } from "~/lib/mcp/resolve-mcp-permissions";

/**
 * Desktop向けセッション取得エンドポイント
 * Desktop の desktopSessionSchema と互換する形式で返す
 */
export const GET = async (request: NextRequest) =>
  withDesktopAuth(request, async (verifiedUser) => {
    const user = await db.user.findUnique({
      where: { id: verifiedUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        members: {
          where: buildOrgMemberWhere(verifiedUser.userId, verifiedUser.orgSlug),
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            organization: {
              select: {
                id: true,
                slug: true,
                name: true,
                logoUrl: true,
                updatedAt: true,
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
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const member = user.members[0];
    const org = member?.organization ?? null;
    const defaultRole = org?.roles[0] ?? null;
    const mcpServers = org?.mcpServers ?? [];

    // OrganizationRole のデフォルト権限 + サーバー別オーバーライドで有効権限を算出。
    // session は UI 表示用に全サーバーの権限状態を返す（mcp-configs は
    // execute=false のサーバーを除外する点で挙動が異なる）
    // source は manager では個人直接付与のみのため INDIVIDUAL 固定。
    // SCIM 経由のグループ/組織単位の権限が manager に入ってきた場合に "GROUP" 等を追加する
    const permissions = mcpServers.map((server) => ({
      source: "INDIVIDUAL" as const,
      mcpServerId: server.id,
      ...resolveMcpPermissions(server.id, defaultRole),
    }));

    // permissions の実値のみハッシュ対象とし、ロゴ等の権限非関連な
    // updatedAt 更新で desktop が不要な再同期をしないようにする。
    // DB 返却順に依存しないよう mcpServerId でソートして決定論性を保証する
    const sortedPermissions = [...permissions].sort((a, b) =>
      a.mcpServerId.localeCompare(b.mcpServerId),
    );
    const policyVersion = createHash("sha256")
      .update(
        JSON.stringify({ orgId: org?.id, permissions: sortedPermissions }),
      )
      .digest("hex");

    return NextResponse.json({
      user: {
        id: user.id,
        sub: verifiedUser.sub,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      organization: {
        id: org?.id ?? null,
        slug: org?.slug ?? null,
        name: org?.name ?? null,
        logoUrl: org?.logoUrl ?? null,
      },
      // manager では SCIM グループ・OrgUnit 管理は行わない
      groups: [],
      orgUnits: [],
      permissions,
      // manager 側で有効化する機能フラグ。
      // accessRequests は SCIM フローを前提とした権限申請機能のため manager では無効固定
      // catalog/policySync/auditLogSync は manager の主要機能のため有効固定
      features: {
        catalog: true,
        accessRequests: false,
        policySync: true,
        auditLogSync: true,
      },
      policyVersion,
    });
  });
