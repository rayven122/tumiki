import type { NextRequest } from "next/server";
import { cache } from "react";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { ManagementClient } from "auth0";

export type { SessionData } from "@auth0/nextjs-auth0/types";
export * from "./oauth.js";
export * from "./errors.js";
export * from "./providers/index.js";
export * from "./providers/validation.js";

export const auth0 = new Auth0Client();

export const managementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_M2M_CLIENT_ID!,
  clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!,
});

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
