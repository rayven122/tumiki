import { describe, test, expect, beforeEach, vi } from "vitest";
import { updateDynamicSearch } from "../updateDynamicSearch";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

describe("updateDynamicSearch", () => {
  let mockTx: PrismaTransactionClient;
  const testOrganizationId = "org-123";
  const testServerId = "server-123" as McpServerId;

  beforeEach(() => {
    // Prismaトランザクションクライアントのモック
    mockTx = {
      mcpServer: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("Dynamic Search設定を有効にできる", async () => {
    // モックデータのセットアップ
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue({
      id: testServerId,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findUnique>>);

    vi.mocked(mockTx.mcpServer.update).mockResolvedValue({
      id: testServerId,
      dynamicSearch: true,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.update>>);

    // 実行
    const result = await updateDynamicSearch(mockTx, {
      id: testServerId,
      dynamicSearchEnabled: true,
      organizationId: testOrganizationId,
    });

    // 検証
    expect(result).toStrictEqual({ id: testServerId });
    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: testOrganizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(mockTx.mcpServer.update).toHaveBeenCalledWith({
      where: { id: testServerId },
      data: { dynamicSearch: true },
    });
  });

  test("Dynamic Search設定を無効にできる", async () => {
    // モックデータのセットアップ
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue({
      id: testServerId,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findUnique>>);

    vi.mocked(mockTx.mcpServer.update).mockResolvedValue({
      id: testServerId,
      dynamicSearch: false,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.update>>);

    // 実行
    const result = await updateDynamicSearch(mockTx, {
      id: testServerId,
      dynamicSearchEnabled: false,
      organizationId: testOrganizationId,
    });

    // 検証
    expect(result).toStrictEqual({ id: testServerId });
    expect(mockTx.mcpServer.update).toHaveBeenCalledWith({
      where: { id: testServerId },
      data: { dynamicSearch: false },
    });
  });

  test("サーバーが見つからない場合はエラーをスローする", async () => {
    // サーバーが存在しない
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateDynamicSearch(mockTx, {
        id: testServerId,
        dynamicSearchEnabled: true,
        organizationId: testOrganizationId,
      }),
    ).rejects.toThrow("サーバーが見つかりません");

    // updateは呼ばれない
    expect(mockTx.mcpServer.update).not.toHaveBeenCalled();
  });

  test("削除済みのサーバーは検索対象外となる", async () => {
    // 削除済みサーバーはfindUniqueでnullが返る想定
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateDynamicSearch(mockTx, {
        id: testServerId,
        dynamicSearchEnabled: true,
        organizationId: testOrganizationId,
      }),
    ).rejects.toThrow("サーバーが見つかりません");

    // deletedAt: nullの条件が含まれていることを確認
    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: testOrganizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
  });

  test("別の組織のサーバーにはアクセスできない", async () => {
    // 別の組織のサーバー
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateDynamicSearch(mockTx, {
        id: testServerId,
        dynamicSearchEnabled: true,
        organizationId: "different-org",
      }),
    ).rejects.toThrow("サーバーが見つかりません");

    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: "different-org",
        deletedAt: null,
      },
      select: { id: true },
    });
  });
});
