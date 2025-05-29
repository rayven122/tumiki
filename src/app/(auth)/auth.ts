import { sleep } from "@trpc/server/unstable-core-do-not-import";
import type { Session } from "next-auth";

export type UserType = "guest" | "regular";

export async function auth(): Promise<Session> {
  // const { auth: _ } = await import("@/server/auth");
  await sleep(1000);

  // return auth();
  return {
    // TODO: 書き換える(dummy account)
    user: {
      id: "3f29d52e-7e3f-4b56-9e0c-bad5a4c620f8",
      role: "USER",
      type: "regular",
    },
    expires: new Date("2025-12-31T23:59:59Z").toISOString(),
  };
}
