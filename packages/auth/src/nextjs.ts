import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const nextAuthResult = NextAuth(authConfig);
const { auth: uncachedAuth, handlers, signIn, signOut } = nextAuthResult;

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };