import type { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { NextRequest } from "next/server";
import { cache } from "react";

import { auth0 } from "./clients.js";

// サーバー専用のエクスポート
export * from "./oauth.js";
export * from "./providers.js";
export { auth0, auth0OAuth, managementClient } from "./clients.js";

type SessionReturnType = Awaited<ReturnType<Auth0Client["getSession"]>>;

const auth: () => Promise<SessionReturnType> = cache(() => auth0.getSession());

export { auth };

export async function authSignIn(
  _provider?: string,
  options: { returnTo?: string } = {},
) {
  const returnTo = options.returnTo || "/dashboard";
  return auth0.startInteractiveLogin({ returnTo });
}

// Next Authの`auth`関数に似た関数
export async function getAuth(req: NextRequest): Promise<SessionReturnType> {
  return auth0.getSession(req);
}
