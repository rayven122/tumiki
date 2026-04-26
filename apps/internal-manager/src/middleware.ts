import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const middleware = async (req: NextRequest) => {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
};

export const config = {
  matcher: ["/admin/:path*"],
};
