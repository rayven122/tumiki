import { createHash } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { withDesktopAuth } from "~/lib/auth/with-desktop-auth";
import { buildOrgMemberWhere } from "~/lib/auth/org-member-where";

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

    // この PR では Desktop 認証の成立確認に責務を限定する。
    // MCP catalog / policy sync 用の権限配布は後続 PR で追加する。
    const permissions: Array<{
      source: "GROUP" | "INDIVIDUAL";
      mcpServerId: string;
      read: boolean;
      write: boolean;
      execute: boolean;
    }> = [];
    const policyVersion = createHash("sha256")
      .update(JSON.stringify({ orgId: org?.id ?? null, userId: user.id }))
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
      // catalog/policySync/auditLogSync は後続の MCP 同期 PR で有効化する
      features: {
        catalog: false,
        accessRequests: false,
        policySync: false,
        auditLogSync: false,
      },
      policyVersion,
    });
  });
