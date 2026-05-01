import { NextResponse, type NextRequest } from "next/server";
import { getJackson } from "@/server/jackson";

/**
 * OIDC IdP の UserInfo エンドポイント
 *
 * Bearer トークンを受けて、認証されたユーザーの情報（email / name / groups 等）を返す。
 */
const handler = async (req: NextRequest) => {
  const { oauthController } = await getJackson();
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  try {
    const userInfo = await oauthController.userInfo(token);
    return NextResponse.json(userInfo);
  } catch (e) {
    const message = e instanceof Error ? e.message : "userinfo_error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
};

export const GET = handler;
export const POST = handler;

export const dynamic = "force-dynamic";
