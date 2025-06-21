import type { NextAuthResult, Session } from "next-auth";
import { cache } from "react";
import NextAuth from "next-auth";

import { authConfig } from "./config";

export type { Session };

const nextAuth = NextAuth(authConfig);

/**
 * This is the main way to get session data for your RSCs.
 * This will de-duplicate all calls to next-auth's default `auth()` function and only call it once per request
 */
const auth: () => Promise<Session | null> = cache(nextAuth.auth);

const handlers: NextAuthResult["handlers"] = nextAuth.handlers;

export { handlers, auth };

export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

export const authHandlers: NextAuthResult["handlers"] = handlers;
export const authSignIn = signIn;
export const authSignOut = signOut;
