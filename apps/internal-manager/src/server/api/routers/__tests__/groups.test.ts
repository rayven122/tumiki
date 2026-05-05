import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { GroupSource, Prisma, Role } from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { GROUP_LIST_LIMIT, groupsRouter } from "../groups";
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
  groupsRouter.createCaller({
    db,
    headers: new Headers(),
    session: buildSession(),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("groupsRouter", () => {
  test("listは表示上限超過検出用に1件多く取得する", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      group: { findMany },
    } as unknown as Context["db"]);

    await expect(caller.list()).resolves.toStrictEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: GROUP_LIST_LIMIT + 1 }),
    );
  });

  describe("updateIdpMapping", () => {
    test("Tumiki作成グループにIdP mappingを設定できる", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ source: GroupSource.TUMIKI });
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        provider: "scim-map",
        externalId: "external-group-001",
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      const caller = buildCaller({
        group: { findUnique, update },
      } as unknown as Context["db"]);

      await expect(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: " external-group-001 ",
        }),
      ).resolves.toStrictEqual({
        id: "group-001",
        provider: "scim-map",
        externalId: "external-group-001",
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "group-001" },
        data: {
          provider: "scim-map",
          externalId: "external-group-001",
        },
        select: {
          id: true,
          provider: true,
          externalId: true,
          updatedAt: true,
        },
      });
    });

    test("Tumiki作成グループのIdP mappingを解除できる", async () => {
      const findUnique = vi
        .fn()
        .mockResolvedValue({ source: GroupSource.TUMIKI });
      const update = vi.fn().mockResolvedValue({
        id: "group-001",
        provider: null,
        externalId: null,
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      const caller = buildCaller({
        group: { findUnique, update },
      } as unknown as Context["db"]);

      await expect(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: null,
        }),
      ).resolves.toStrictEqual({
        id: "group-001",
        provider: null,
        externalId: null,
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "group-001" },
        data: {
          provider: null,
          externalId: null,
        },
        select: {
          id: true,
          provider: true,
          externalId: true,
          updatedAt: true,
        },
      });
    });

    test("SCIMグループにはIdP mappingを設定できない", async () => {
      const update = vi.fn();
      const caller = buildCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.IDP }),
          update,
        },
      } as unknown as Context["db"]);

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "scim-group-001",
          externalId: "external-group-001",
        }),
        "BAD_REQUEST",
      );
      expect(update).not.toHaveBeenCalled();
    });

    test("存在しないグループはNOT_FOUNDを返す", async () => {
      const caller = buildCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      } as unknown as Context["db"]);

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "missing-group",
          externalId: "external-group-001",
        }),
        "NOT_FOUND",
      );
    });

    test("IdP mappingの重複はCONFLICTを返す", async () => {
      const caller = buildCaller({
        group: {
          findUnique: vi.fn().mockResolvedValue({ source: GroupSource.TUMIKI }),
          update: vi.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              {
                code: "P2002",
                clientVersion: "test",
              },
            ),
          ),
        },
      } as unknown as Context["db"]);

      await expectTrpcErrorCode(
        caller.updateIdpMapping({
          groupId: "group-001",
          externalId: "external-group-001",
        }),
        "CONFLICT",
      );
    });
  });
});
