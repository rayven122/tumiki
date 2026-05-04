import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  McpCatalogAuthType,
  McpCatalogStatus,
  McpCatalogTransportType,
  McpToolRiskLevel,
  Prisma,
  Role,
} from "@tumiki/internal-db";
import type { Context } from "../../trpc";
import type * as TrpcModule from "../../trpc";
import { mcpCatalogRouter } from "../mcp-catalog";
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

  test("createはslug重複をCONFLICTにする", async () => {
    const create = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const caller = buildCaller({
      mcpCatalog: { create },
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.create({
        slug: "github",
        name: "GitHub",
        configTemplate: {},
        credentialKeys: [],
      }),
      "CONFLICT",
    );
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

  test("refreshToolsは重複ツール名をBAD_REQUESTにする", async () => {
    const transaction = vi.fn();
    const caller = buildCaller({
      $transaction: transaction,
    } as unknown as Context["db"]);

    await expectTrpcErrorCode(
      caller.refreshTools({
        catalogId: "catalog-001",
        tools: [
          {
            name: "list_repos",
            inputSchema: {},
            defaultAllowed: false,
            riskLevel: McpToolRiskLevel.MEDIUM,
          },
          {
            name: "list_repos",
            inputSchema: {},
            defaultAllowed: false,
            riskLevel: McpToolRiskLevel.MEDIUM,
          },
        ],
      }),
      "BAD_REQUEST",
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});
