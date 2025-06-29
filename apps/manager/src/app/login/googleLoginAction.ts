// app/actions.ts
"use server";

import { auth0 } from "@tumiki/auth";

export async function googleLogin({
  returnTo = "/dashboard",
}: {
  returnTo?: string;
}) {
  return auth0.startInteractiveLogin({
    returnTo,
    authorizationParameters: {},
  });
}
