import type { DefaultSession } from "next-auth";

import type { Role } from "@tumiki/db";

import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    id: string;
    role: Role;
  }
}

export type { Role };
