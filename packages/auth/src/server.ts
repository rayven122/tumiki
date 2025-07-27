import type { NextRequest } from "next/server";
import { cache } from "react";

import { auth0 } from "./clients.js";

// サーバー専用のエクスポート
export * from "./oauth.js";
export * from "./providers/index.js";
export * from "./providers/validation.js";
export { auth0, managementClient } from "./clients.js";

const auth = cache(() => auth0.getSession());

export { auth };

export async function authSignIn(
  _provider?: string,
  options: { returnTo?: string } = {},
) {
  const returnTo = options.returnTo || "/dashboard";
  return auth0.startInteractiveLogin({ returnTo });
}

// Next Authの`auth`関数に似た関数
export async function getAuth(req: NextRequest) {
  return auth0.getSession(req);
}
