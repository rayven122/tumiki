import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

// モックの設定
const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      mockIpcHandlers.set(
        channel,
        handler as (
          event: IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<unknown>,
      );
    },
  },
}));

vi.mock("../../../shared/utils/logger");
vi.mock("../mcp.service");

// テスト対象のインポート（モックの後に行う）
import { setupMcpIpc } from "../mcp.ipc";
import * as mcpService from "../mcp.service";

describe("setupMcpIpc", () => {
  beforeEach(() => {
    mockIpcHandlers.clear();
    vi.clearAllMocks();
    setupMcpIpc();
  });

  describe("mcp:updateServer", () => {
    test("有効な入力でサーバーを更新する", async () => {
      const mockResult = { id: 1, name: "Updated" };
      vi.mocked(mcpService.updateServer).mockResolvedValue(
        mockResult as Awaited<ReturnType<typeof mcpService.updateServer>>,
      );
      const handler = mockIpcHandlers.get("mcp:updateServer");

      const result = await handler!({} as IpcMainInvokeEvent, {
        id: 1,
        name: "Updated",
      });

      expect(result).toStrictEqual(mockResult);
      expect(mcpService.updateServer).toHaveBeenCalledWith(1, {
        name: "Updated",
        description: undefined,
      });
    });

    test("descriptionのみの更新も受け付ける", async () => {
      vi.mocked(mcpService.updateServer).mockResolvedValue(
        {} as Awaited<ReturnType<typeof mcpService.updateServer>>,
      );
      const handler = mockIpcHandlers.get("mcp:updateServer");

      await handler!({} as IpcMainInvokeEvent, {
        id: 1,
        description: "新しい説明",
      });

      expect(mcpService.updateServer).toHaveBeenCalledWith(1, {
        name: undefined,
        description: "新しい説明",
      });
    });

    test("idが欠落している場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:updateServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { name: "Updated" }),
      ).rejects.toThrow("MCPサーバーの更新に失敗しました");
    });

    test("nameが空文字の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:updateServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: 1, name: "" }),
      ).rejects.toThrow("MCPサーバーの更新に失敗しました");
    });

    test("サービスがエラーを投げた場合はラップして再スローする", async () => {
      vi.mocked(mcpService.updateServer).mockRejectedValue(
        new Error("DB接続エラー"),
      );
      const handler = mockIpcHandlers.get("mcp:updateServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: 1, name: "Updated" }),
      ).rejects.toThrow("MCPサーバーの更新に失敗しました: DB接続エラー");
    });
  });

  describe("mcp:deleteServer", () => {
    test("有効なIDでサーバーを削除する", async () => {
      vi.mocked(mcpService.deleteServer).mockResolvedValue(
        undefined as unknown as Awaited<
          ReturnType<typeof mcpService.deleteServer>
        >,
      );
      const handler = mockIpcHandlers.get("mcp:deleteServer");

      await handler!({} as IpcMainInvokeEvent, { id: 1 });

      expect(mcpService.deleteServer).toHaveBeenCalledWith(1);
    });

    test("idが欠落している場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:deleteServer");

      await expect(handler!({} as IpcMainInvokeEvent, {})).rejects.toThrow(
        "MCPサーバーの削除に失敗しました",
      );
    });

    test("idが文字列の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:deleteServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: "invalid" }),
      ).rejects.toThrow("MCPサーバーの削除に失敗しました");
    });

    test("サービスがエラーを投げた場合はラップして再スローする", async () => {
      vi.mocked(mcpService.deleteServer).mockRejectedValue(
        new Error("レコードが見つかりません"),
      );
      const handler = mockIpcHandlers.get("mcp:deleteServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: 99999 }),
      ).rejects.toThrow(
        "MCPサーバーの削除に失敗しました: レコードが見つかりません",
      );
    });
  });

  describe("mcp:toggleServer", () => {
    test("サーバーを無効化する", async () => {
      const mockResult = { id: 1, isEnabled: false };
      vi.mocked(mcpService.toggleServer).mockResolvedValue(
        mockResult as Awaited<ReturnType<typeof mcpService.toggleServer>>,
      );
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      const result = await handler!({} as IpcMainInvokeEvent, {
        id: 1,
        isEnabled: false,
      });

      expect(result).toStrictEqual(mockResult);
      expect(mcpService.toggleServer).toHaveBeenCalledWith(1, false);
    });

    test("サーバーを有効化する", async () => {
      vi.mocked(mcpService.toggleServer).mockResolvedValue({
        id: 1,
        isEnabled: true,
      } as Awaited<ReturnType<typeof mcpService.toggleServer>>);
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      await handler!({} as IpcMainInvokeEvent, { id: 1, isEnabled: true });

      expect(mcpService.toggleServer).toHaveBeenCalledWith(1, true);
    });

    test("isEnabledが欠落している場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: 1 }),
      ).rejects.toThrow("MCPサーバーの切り替えに失敗しました");
    });

    test("idが欠落している場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { isEnabled: false }),
      ).rejects.toThrow("MCPサーバーの切り替えに失敗しました");
    });

    test("サービスがエラーを投げた場合はラップして再スローする", async () => {
      vi.mocked(mcpService.toggleServer).mockRejectedValue(
        new Error("DB接続エラー"),
      );
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { id: 1, isEnabled: false }),
      ).rejects.toThrow("MCPサーバーの切り替えに失敗しました: DB接続エラー");
    });
  });

  describe("mcp:createVirtualServer", () => {
    const validInput = {
      name: "週次レポート",
      description: "GitHubとSlackを束ねた仮想MCP",
      connections: [
        { catalogId: 1, credentials: { GITHUB_TOKEN: "a" } },
        { catalogId: 2, credentials: { SLACK_TOKEN: "b" } },
      ],
    };

    test("有効な入力で仮想MCPを作成する", async () => {
      const mockResult = { serverId: 10, serverName: "週次レポート" };
      vi.mocked(mcpService.createVirtualServer).mockResolvedValue(mockResult);
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      const result = await handler!({} as IpcMainInvokeEvent, validInput);

      expect(result).toStrictEqual(mockResult);
      expect(mcpService.createVirtualServer).toHaveBeenCalledWith(validInput);
    });

    test("接続が空配列の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, {
          ...validInput,
          connections: [],
        }),
      ).rejects.toThrow("仮想MCPサーバーの登録に失敗しました");
    });

    test("nameが空文字の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, { ...validInput, name: "" }),
      ).rejects.toThrow("仮想MCPサーバーの登録に失敗しました");
    });

    test("catalogIdが文字列の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, {
          ...validInput,
          connections: [{ catalogId: "invalid", credentials: {} }],
        }),
      ).rejects.toThrow("仮想MCPサーバーの登録に失敗しました");
    });

    test("catalogIdが0以下の場合はエラーになる", async () => {
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, {
          ...validInput,
          connections: [{ catalogId: 0, credentials: {} }],
        }),
      ).rejects.toThrow("仮想MCPサーバーの登録に失敗しました");
    });

    test("接続が11件以上の場合はエラーになる（上限10件）", async () => {
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");
      const tooManyConnections = Array.from({ length: 11 }, (_, i) => ({
        catalogId: i + 1,
        credentials: {},
      }));

      await expect(
        handler!({} as IpcMainInvokeEvent, {
          ...validInput,
          connections: tooManyConnections,
        }),
      ).rejects.toThrow("仮想MCPサーバーの登録に失敗しました");
    });

    test("サービスがエラーを投げた場合はラップして再スローする", async () => {
      vi.mocked(mcpService.createVirtualServer).mockRejectedValue(
        new Error("カタログ(id=99)が見つかりません"),
      );
      const handler = mockIpcHandlers.get("mcp:createVirtualServer");

      await expect(
        handler!({} as IpcMainInvokeEvent, validInput),
      ).rejects.toThrow(
        "仮想MCPサーバーの登録に失敗しました: カタログ(id=99)が見つかりません",
      );
    });
  });

  describe("ハンドラー登録", () => {
    test("全てのIPCハンドラーが登録される", () => {
      expect(mockIpcHandlers.has("mcp:createFromCatalog")).toBe(true);
      expect(mockIpcHandlers.has("mcp:createVirtualServer")).toBe(true);
      expect(mockIpcHandlers.has("mcp:getAll")).toBe(true);
      expect(mockIpcHandlers.has("mcp:updateServer")).toBe(true);
      expect(mockIpcHandlers.has("mcp:deleteServer")).toBe(true);
      expect(mockIpcHandlers.has("mcp:toggleServer")).toBe(true);
    });
  });
});
