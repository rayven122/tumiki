/**
 * OAuth トークン削除エンドポイント
 * DELETE /api/oauth/revoke/[tokenId]
 *
 * OAuthTokenを削除してキャッシュを無効化
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/db/server";
import { auth } from "@/auth";
import { invalidateCache } from "@tumiki/oauth-token-manager";

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) => {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 },
      );
    }

    // トークンを取得して権限チェック
    const oauthToken = await db.mcpOAuthToken.findUnique({
      where: { id: tokenId },
      include: {
        oauthClient: {
          include: {
            mcpServerTemplate: true,
          },
        },
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!oauthToken) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // 組織メンバーシップチェック
    if (oauthToken.organization.members.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized to delete this token" },
        { status: 403 },
      );
    }

    // TODO: プロバイダーの revocation endpoint がある場合はトークンを取り消す
    // 現在はDBからの削除とキャッシュ無効化のみ実施

    // キャッシュを無効化
    if (oauthToken.oauthClient.mcpServerTemplateId) {
      await invalidateCache(userId, oauthToken.oauthClient.mcpServerTemplateId);
    }

    // トークンを削除
    await db.mcpOAuthToken.delete({
      where: { id: tokenId },
    });

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    console.error("[OAuth Revoke Error]", error);

    return NextResponse.json(
      {
        error: "Failed to revoke token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
