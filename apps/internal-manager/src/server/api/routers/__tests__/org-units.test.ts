import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { Role } from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { orgUnitsRouter } from "../org-units";
import { expectTrpcErrorCode } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("~/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/server/api/trpc", async () => {
  const actual = await vi.importActual<typeof TrpcModule>("../../trpc");
  return actual;
});

const buildSession = (): Session => ({
  user: {
    id: "admin-001",
    sub: "admin-001",
    email: "admin@example.com",
    name: "Admin User",
    image: null,
    role: Role.SYSTEM_ADMIN,
    tumiki: null,
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

const buildCaller = (db: Context["db"]) =>
  orgUnitsRouter.createCaller({
    db,
    headers: new Headers(),
    session: buildSession(),
  });

const buildTransactionCaller = (tx: unknown) =>
  buildCaller({
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as Context["db"]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orgUnitsRouter", () => {
  test("updateParentは親と子孫のpathを更新する", async () => {
    const update = vi
      .fn()
      .mockResolvedValueOnce({ id: "child", path: "/parent/department:child" })
      .mockResolvedValueOnce({ id: "grandchild", path: "/parent/child/grand" });
    const tx = {
      orgUnit: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "child",
          externalId: "department:child",
          path: "/child",
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: "parent",
          path: "/parent",
        }),
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: "grandchild", path: "/child/grand" }]),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.updateParent({ orgUnitId: "child", parentId: "parent" }),
    ).resolves.toStrictEqual({ id: "child", path: "/parent/department:child" });
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: "child" },
      data: { parentId: "parent", path: "/parent/department:child" },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: "grandchild" },
      data: { path: "/parent/department:child/grand" },
    });
  });

  test("updateParentはルートへ移動できる", async () => {
    const update = vi.fn().mockResolvedValue({ id: "child", path: "/child" });
    const tx = {
      orgUnit: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "child",
          externalId: null,
          path: "/parent/child",
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update,
      },
    };
    const caller = buildTransactionCaller(tx);

    await expect(
      caller.updateParent({ orgUnitId: "child", parentId: null }),
    ).resolves.toStrictEqual({ id: "child", path: "/child" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "child" },
      data: { parentId: null, path: "/child" },
    });
  });

  test("updateParentは自分自身への移動をBAD_REQUESTにする", async () => {
    const caller = buildCaller({} as Context["db"]);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "child", parentId: "child" }),
      "BAD_REQUEST",
    );
  });

  test("updateParentは子孫配下への移動をBAD_REQUESTにする", async () => {
    const tx = {
      orgUnit: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "parent",
          externalId: null,
          path: "/parent",
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: "child",
          path: "/parent/child",
        }),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "parent", parentId: "child" }),
      "BAD_REQUEST",
    );
  });

  test("updateParentは存在しない親をBAD_REQUESTにする", async () => {
    const tx = {
      orgUnit: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "child",
          externalId: null,
          path: "/child",
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = buildTransactionCaller(tx);

    await expectTrpcErrorCode(
      caller.updateParent({ orgUnitId: "child", parentId: "missing" }),
      "BAD_REQUEST",
    );
  });
});
