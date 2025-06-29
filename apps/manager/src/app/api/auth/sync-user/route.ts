import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logSyncSuccess, logSyncError } from "@/lib/logger/auth-sync";
import { type syncUserFromAuth0Schema } from "@/server/api/routers/user";
import { api } from "@/trpc/server";

// API認証用のヘッダー検証
const validateAuthHeader = (request: NextRequest): boolean => {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.AUTH0_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error("AUTH0_WEBHOOK_SECRET is not configured");
    return false;
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  return token === expectedSecret;
};

export const POST = async (request: NextRequest) => {
  const startTime = Date.now();

  // CORS設定用の共通ヘッダー
  const allowedOrigin =
    process.env.NODE_ENV === "production" ? "https://auth.tumiki.cloud" : "*";

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    // 認証チェック
    if (!validateAuthHeader(request)) {
      console.error("Unauthorized request to sync-user API");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    // リクエストボディの解析
    const body: unknown = await request.json();
    // tRPCのsyncUserFromAuth0 mutationを呼び出し
    // body データは、tRPC の input スキーマで検証されます
    const dbUser = await api.user.syncUserFromAuth0(
      body as z.infer<typeof syncUserFromAuth0Schema>,
    );

    const duration = Date.now() - startTime;

    // 成功ログ
    logSyncSuccess(
      dbUser.id,
      "post-login-action",
      {
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      },
      duration,
    );

    console.log(`User ${dbUser.id} synchronized successfully:`, {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // エラーログ
    logSyncError("unknown", "post-login-action", errorMessage, duration);

    console.error("Auth0 Post-Login Action sync error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
};

// CORS設定（Auth0からのリクエストを許可）
export async function OPTIONS(_request: NextRequest) {
  // 本番環境のAuth0ドメインに制限
  const allowedOrigin =
    process.env.NODE_ENV === "production" ? "https://auth.tumiki.cloud" : "*"; // 開発環境では全許可

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
