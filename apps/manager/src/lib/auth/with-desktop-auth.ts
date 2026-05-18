import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyDesktopJwt,
  type VerifiedDesktopUser,
} from "./verify-desktop-jwt";

export const withDesktopAuth = async (
  request: NextRequest,
  handler: (user: VerifiedDesktopUser) => Promise<Response>,
): Promise<Response> => {
  let verifiedUser: VerifiedDesktopUser;
  try {
    verifiedUser = await verifyDesktopJwt(request.headers.get("Authorization"));
  } catch (error) {
    console.warn(
      "Desktop JWT verification failed:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler(verifiedUser);
};
