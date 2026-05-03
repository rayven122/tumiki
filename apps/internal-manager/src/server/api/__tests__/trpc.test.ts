import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Role } from "@tumiki/internal-db";
import { adminProcedure, createTRPCRouter, type Context } from "../trpc";

vi.mock("server-only", () => ({}));
vi.mock("~/auth", () => ({
  auth: vi.fn(),
}));

const adminRouter = createTRPCRouter({
  role: adminProcedure.query(({ ctx }) => ctx.session.user.role),
});

const buildSession = (role: Role): Session => ({
  user: {
    id: "user-001",
    sub: "user-001",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    role,
    tumiki: null,
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

const buildContext = (session: Session | null): Context => ({
  db: {} as Context["db"],
  headers: new Headers(),
  session,
});

const expectTrpcErrorCode = async (
  promise: Promise<unknown>,
  code: TRPCError["code"],
) => {
  try {
    await promise;
    throw new Error("TRPCErrorが発生しませんでした");
  } catch (error) {
    expect(error instanceof TRPCError).toStrictEqual(true);
    expect((error as TRPCError).code).toStrictEqual(code);
  }
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("adminProcedure", () => {
  test("未認証ユーザーはUNAUTHORIZEDを受け取る", async () => {
    const caller = adminRouter.createCaller(buildContext(null));

    await expectTrpcErrorCode(caller.role(), "UNAUTHORIZED");
  });

  test("USERロールはFORBIDDENを受け取る", async () => {
    const caller = adminRouter.createCaller(
      buildContext(buildSession(Role.USER)),
    );

    await expectTrpcErrorCode(caller.role(), "FORBIDDEN");
  });

  test("SYSTEM_ADMINロールは管理者プロシージャを実行できる", async () => {
    const caller = adminRouter.createCaller(
      buildContext(buildSession(Role.SYSTEM_ADMIN)),
    );

    await expect(caller.role()).resolves.toStrictEqual(Role.SYSTEM_ADMIN);
  });
});
