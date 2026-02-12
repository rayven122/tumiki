import { describe, test, expect, beforeEach, vi } from "vitest";
import { updateIconPath } from "../updateIconPath";
import type { PrismaTransactionClient } from "@tumiki/db";
import type { McpServerId } from "@/schema/ids";

describe("updateIconPath", () => {
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

  test("プリセットアイコン（lucide形式）を設定できる", async () => {
    // モックデータのセットアップ
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue({
      id: testServerId,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findUnique>>);

    vi.mocked(mockTx.mcpServer.update).mockResolvedValue({
      id: testServerId,
      iconPath: "lucide:Server",
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.update>>);

    // 実行
    const result = await updateIconPath(
      mockTx,
      {
        id: testServerId,
        iconPath: "lucide:Server",
      },
      testOrganizationId,
    );

    // 検証
    expect(result).toStrictEqual({ id: testServerId });
    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: testOrganizationId,
        deletedAt: null,
      },
    });
    expect(mockTx.mcpServer.update).toHaveBeenCalledWith({
      where: { id: testServerId },
      data: { iconPath: "lucide:Server" },
    });
  });

  test("カスタム画像URL形式を設定できる", async () => {
    const customImageUrl = "https://example.blob.vercel-storage.com/image.png";

    // モックデータのセットアップ
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue({
      id: testServerId,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findUnique>>);

    vi.mocked(mockTx.mcpServer.update).mockResolvedValue({
      id: testServerId,
      iconPath: customImageUrl,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.update>>);

    // 実行
    const result = await updateIconPath(
      mockTx,
      {
        id: testServerId,
        iconPath: customImageUrl,
      },
      testOrganizationId,
    );

    // 検証
    expect(result).toStrictEqual({ id: testServerId });
    expect(mockTx.mcpServer.update).toHaveBeenCalledWith({
      where: { id: testServerId },
      data: { iconPath: customImageUrl },
    });
  });

  test("nullを設定してデフォルトに戻せる", async () => {
    // モックデータのセットアップ
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue({
      id: testServerId,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.findUnique>>);

    vi.mocked(mockTx.mcpServer.update).mockResolvedValue({
      id: testServerId,
      iconPath: null,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpServer.update>>);

    // 実行
    const result = await updateIconPath(
      mockTx,
      {
        id: testServerId,
        iconPath: null,
      },
      testOrganizationId,
    );

    // 検証
    expect(result).toStrictEqual({ id: testServerId });
    expect(mockTx.mcpServer.update).toHaveBeenCalledWith({
      where: { id: testServerId },
      data: { iconPath: null },
    });
  });

  test("サーバーが見つからない場合はエラーをスローする", async () => {
    // サーバーが存在しない
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateIconPath(
        mockTx,
        {
          id: testServerId,
          iconPath: "lucide:Server",
        },
        testOrganizationId,
      ),
    ).rejects.toThrow("MCPサーバーが見つかりません");

    // updateは呼ばれない
    expect(mockTx.mcpServer.update).not.toHaveBeenCalled();
  });

  test("削除済みのサーバーは検索対象外となる", async () => {
    // 削除済みサーバーはfindUniqueでnullが返る想定
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateIconPath(
        mockTx,
        {
          id: testServerId,
          iconPath: "lucide:Bot",
        },
        testOrganizationId,
      ),
    ).rejects.toThrow("MCPサーバーが見つかりません");

    // deletedAt: nullの条件が含まれていることを確認
    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: testOrganizationId,
        deletedAt: null,
      },
    });
  });

  test("別の組織のサーバーにはアクセスできない", async () => {
    // 別の組織のサーバー
    vi.mocked(mockTx.mcpServer.findUnique).mockResolvedValue(null);

    // 実行 & 検証
    await expect(
      updateIconPath(
        mockTx,
        {
          id: testServerId,
          iconPath: "lucide:Database",
        },
        "different-org",
      ),
    ).rejects.toThrow("MCPサーバーが見つかりません");

    expect(mockTx.mcpServer.findUnique).toHaveBeenCalledWith({
      where: {
        id: testServerId,
        organizationId: "different-org",
        deletedAt: null,
      },
    });
  });
});
