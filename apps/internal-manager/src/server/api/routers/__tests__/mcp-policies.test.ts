import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PolicyEffect, Role } from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { mcpPoliciesRouter } from "../mcp-policies";
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
  mcpPoliciesRouter.createCaller({
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

type MatrixCatalogFindManyArgs = {
  include: {
    tools: {
      include: {
        orgUnitPermissions: {
          where: { orgUnitId: string };
          select: {
            orgUnitId: true;
            toolId: true;
            effect: true;
          };
        };
      };
    };
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mcpPoliciesRouter", () => {
  test("getMatrixはカタログクエリに上限を設定する", async () => {
    const findCatalogs = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      orgUnit: { findMany: vi.fn().mockResolvedValue([]) },
      mcpCatalog: { findMany: findCatalogs },
    } as unknown as Context["db"]);

    await expect(caller.getMatrix()).resolves.toStrictEqual({
      orgUnits: [],
      catalogs: [],
    });
    expect(findCatalogs).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  test("getMatrixは選択部署の権限だけを取得する", async () => {
    const findCatalogs = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      orgUnit: { findMany: vi.fn().mockResolvedValue([]) },
      mcpCatalog: { findMany: findCatalogs },
    } as unknown as Context["db"]);

    await expect(
      caller.getMatrix({ orgUnitId: "org-001" }),
    ).resolves.toStrictEqual({
      orgUnits: [],
      catalogs: [],
    });
    const [findManyArgs] = findCatalogs.mock.calls[0] as [
      MatrixCatalogFindManyArgs,
    ];
    expect(findManyArgs.include.tools.include.orgUnitPermissions).toStrictEqual(
      {
        where: { orgUnitId: "org-001" },
        select: {
          orgUnitId: true,
          toolId: true,
          effect: true,
        },
      },
    );
  });

  test("getEffectivePermissionsはカタログクエリに上限を設定する", async () => {
    const findCatalogs = vi.fn().mockResolvedValue([]);
    const caller = buildCaller({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      orgUnit: { findMany: vi.fn().mockResolvedValue([]) },
      mcpCatalog: { findMany: findCatalogs },
    } as unknown as Context["db"]);

    await expect(
      caller.getEffectivePermissions({ userId: "user-001" }),
    ).resolves.toBeNull();
    expect(findCatalogs).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  test.each([
    { effect: PolicyEffect.ALLOW, label: "許可" },
    { effect: PolicyEffect.DENY, label: "拒否" },
  ])("updateToolPermissionは$labelを登録または更新する", async ({ effect }) => {
    const upsert = vi.fn().mockResolvedValue({});
    const deleteMany = vi.fn();
    const caller = buildTransactionCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-001" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue({ id: "org-001" }) },
      orgUnitToolPermission: { upsert, deleteMany },
    });

    await expect(
      caller.updateToolPermission({
        orgUnitId: "org-001",
        catalogId: "catalog-001",
        toolId: "tool-001",
        effect,
      }),
    ).resolves.toStrictEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        orgUnitId_toolId: {
          orgUnitId: "org-001",
          toolId: "tool-001",
        },
      },
      create: {
        orgUnitId: "org-001",
        catalogId: "catalog-001",
        toolId: "tool-001",
        effect,
      },
      update: { effect },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test("updateToolPermissionはnull指定で権限設定を削除する", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const caller = buildTransactionCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-001" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue({ id: "org-001" }) },
      orgUnitToolPermission: { upsert, deleteMany },
    });

    await expect(
      caller.updateToolPermission({
        orgUnitId: "org-001",
        catalogId: "catalog-001",
        toolId: "tool-001",
        effect: null,
      }),
    ).resolves.toStrictEqual({ ok: true });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { orgUnitId: "org-001", toolId: "tool-001" },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  test("updateToolPermissionはtoolIdとcatalogIdの不整合をBAD_REQUESTにする", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn();
    const caller = buildTransactionCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-other" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue({ id: "org-001" }) },
      orgUnitToolPermission: { upsert, deleteMany },
    });

    await expectTrpcErrorCode(
      caller.updateToolPermission({
        orgUnitId: "org-001",
        catalogId: "catalog-001",
        toolId: "tool-001",
        effect: PolicyEffect.ALLOW,
      }),
      "BAD_REQUEST",
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test("updateToolPermissionは存在しないtoolIdをBAD_REQUESTにする", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn();
    const caller = buildTransactionCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue({ id: "org-001" }) },
      orgUnitToolPermission: { upsert, deleteMany },
    });

    await expectTrpcErrorCode(
      caller.updateToolPermission({
        orgUnitId: "org-001",
        catalogId: "catalog-001",
        toolId: "tool-missing",
        effect: PolicyEffect.ALLOW,
      }),
      "BAD_REQUEST",
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  test("updateToolPermissionは存在しないorgUnitIdをBAD_REQUESTにする", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn();
    const caller = buildTransactionCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-001" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue(null) },
      orgUnitToolPermission: { upsert, deleteMany },
    });

    await expectTrpcErrorCode(
      caller.updateToolPermission({
        orgUnitId: "org-missing",
        catalogId: "catalog-001",
        toolId: "tool-001",
        effect: PolicyEffect.ALLOW,
      }),
      "BAD_REQUEST",
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
