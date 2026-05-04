import { TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  McpCatalogAuthType,
  McpCatalogStatus,
  McpCatalogTransportType,
  Role,
} from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { mcpCatalogRouter } from "../mcp-catalog";

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

const expectTrpcErrorCode = async (
  promise: Promise<unknown>,
  code: TRPCError["code"],
) => {
  let error: unknown;
  try {
    await promise;
  } catch (caught) {
    error = caught;
  }

  if (error === undefined) {
    throw new Error("TRPCErrorが発生しませんでした");
  }
  expect(error instanceof TRPCError).toStrictEqual(true);
  if (!(error instanceof TRPCError)) {
    throw new Error("TRPCErrorではないエラーが発生しました");
  }
  expect(error.code).toStrictEqual(code);
};

const buildCaller = (db: Context["db"]) =>
  mcpCatalogRouter.createCaller({
    db,
    headers: new Headers(),
    session: buildSession(),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mcpCatalogRouter", () => {
  test("createは末尾ハイフンのslugをBAD_REQUESTにする", async () => {
    const create = vi.fn();
    const caller = buildCaller({
      mcpCatalog: { create },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.create({
        slug: "github-",
        name: "GitHub",
        configTemplate: {},
        credentialKeys: [],
      }),
      "BAD_REQUEST",
    );
    expect(create).not.toHaveBeenCalled();
  });

  test("updateは存在しないカタログをNOT_FOUNDにする", async () => {
    const update = vi.fn();
    const caller = buildCaller({
      mcpCatalog: {
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.update({
        id: "catalog-missing",
        name: "GitHub",
        description: null,
        transportType: McpCatalogTransportType.STREAMABLE_HTTP,
        authType: McpCatalogAuthType.OAUTH,
        status: McpCatalogStatus.ACTIVE,
        iconPath: null,
        configTemplate: {},
        credentialKeys: [],
      }),
      "NOT_FOUND",
    );
    expect(update).not.toHaveBeenCalled();
  });

  test("deleteは存在しないカタログをNOT_FOUNDにする", async () => {
    const update = vi.fn();
    const caller = buildCaller({
      mcpCatalog: {
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.delete({ id: "catalog-missing" }),
      "NOT_FOUND",
    );
    expect(update).not.toHaveBeenCalled();
  });

  test("refreshToolsは存在しないカタログをNOT_FOUNDにする", async () => {
    const updateMany = vi.fn();
    type RefreshToolsTransaction = (tx: {
      mcpCatalog: { findFirst: () => Promise<null> };
      mcpCatalogTool: { updateMany: typeof updateMany };
    }) => Promise<unknown>;
    const caller = buildCaller({
      $transaction: vi.fn((callback: RefreshToolsTransaction) =>
        callback({
          mcpCatalog: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          mcpCatalogTool: { updateMany },
        }),
      ),
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.refreshTools({
        catalogId: "catalog-missing",
        tools: [],
      }),
      "NOT_FOUND",
    );
    expect(updateMany).not.toHaveBeenCalled();
  });
});
