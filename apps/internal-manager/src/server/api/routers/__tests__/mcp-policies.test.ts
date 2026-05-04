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

  test("updateToolPermissionはtoolIdとcatalogIdの不整合をBAD_REQUESTにする", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn();
    const caller = buildCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-other" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue({ id: "org-001" }) },
      orgUnitToolPermission: { upsert, deleteMany },
    } as unknown as Context["db"]);

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

  test("updateToolPermissionは存在しないorgUnitIdをBAD_REQUESTにする", async () => {
    const upsert = vi.fn();
    const deleteMany = vi.fn();
    const caller = buildCaller({
      mcpCatalogTool: {
        findFirst: vi.fn().mockResolvedValue({ catalogId: "catalog-001" }),
      },
      orgUnit: { findUnique: vi.fn().mockResolvedValue(null) },
      orgUnitToolPermission: { upsert, deleteMany },
    } as unknown as Context["db"]);

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
