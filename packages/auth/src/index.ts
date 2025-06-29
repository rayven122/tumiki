import type { NextRequest } from "next/server";
import { cache } from "react";
import { Auth0Client } from "@auth0/nextjs-auth0/server";

// export const auth0 = new Auth0Client({
//   domain: 'your-tenant.auth0.com',
//   clientId: 'YOUR_CLIENT_ID',
//   appBaseUrl: 'http://localhost:3000',
//   secret: '長くてランダムな文字列', // 32文字以上推奨
//   clientAuthentication: {
//     clientSecret: 'YOUR_CLIENT_SECRET'
//     // または
//     // clientAssertionSigningKey: '...'
//   }
// });

export const auth0 = new Auth0Client();

const auth = cache(() => auth0.getSession());

export { auth };

export type { SessionData } from "@auth0/nextjs-auth0/types";

export async function authSignIn(
  provider?: string,
  options: { returnTo?: string } = {},
) {
  const returnTo = options.returnTo || "/dashboard";
  return auth0.startInteractiveLogin({ returnTo });
}

// Next Authの`auth`関数に似た関数
export async function getAuth(req: NextRequest) {
  return auth0.getSession(req);
}
