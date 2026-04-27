import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "~/auth";

/** /admin ルートの認証ガード（Node.js ランタイムで動作） */
export const proxy = async (req: NextRequest) => {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
};

export const config = {
  matcher: ["/admin/:path*"],
};
