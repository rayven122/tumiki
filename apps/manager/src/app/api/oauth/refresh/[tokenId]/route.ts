/**
 * OAuth トークンリフレッシュエンドポイント
 * POST /api/oauth/refresh/[tokenId]
 *
 * @tumiki/oauth-token-manager を利用してトークンをリフレッシュ
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { refreshBackendToken } from "@tumiki/oauth-token-manager";

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) => {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 },
      );
    }

    // @tumiki/oauth-token-manager を使用してトークンをリフレッシュ
    const refreshedToken = await refreshBackendToken(tokenId);

    return NextResponse.json({
      success: true,
      expiresAt: refreshedToken.expiresAt,
    });
  } catch (error) {
    console.error("[OAuth Refresh Error]", error);

    return NextResponse.json(
      {
        error: "Failed to refresh token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
