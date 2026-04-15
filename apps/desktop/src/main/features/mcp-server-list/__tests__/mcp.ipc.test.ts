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
vi.mock("../../mcp-proxy/mcp.service", () => ({
  startMcpServers: vi.fn().mockResolvedValue([]),
}));

// テスト対象のインポート（モックの後に行う）
import { setupMcpIpc } from "../mcp.ipc";
import * as mcpService from "../mcp.service";
import { startMcpServers } from "../../mcp-proxy/mcp.service";

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
    test("サーバーを無効化し、MCPプロキシを再起動する", async () => {
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
      expect(startMcpServers).toHaveBeenCalled();
    });

    test("サーバーを有効化し、MCPプロキシを再起動する", async () => {
      vi.mocked(mcpService.toggleServer).mockResolvedValue({
        id: 1,
        isEnabled: true,
      } as Awaited<ReturnType<typeof mcpService.toggleServer>>);
      const handler = mockIpcHandlers.get("mcp:toggleServer");

      await handler!({} as IpcMainInvokeEvent, { id: 1, isEnabled: true });

      expect(mcpService.toggleServer).toHaveBeenCalledWith(1, true);
      expect(startMcpServers).toHaveBeenCalled();
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

  describe("ハンドラー登録", () => {
    test("全てのIPCハンドラーが登録される", () => {
      expect(mockIpcHandlers.has("mcp:createFromCatalog")).toBe(true);
      expect(mockIpcHandlers.has("mcp:getAll")).toBe(true);
      expect(mockIpcHandlers.has("mcp:updateServer")).toBe(true);
      expect(mockIpcHandlers.has("mcp:deleteServer")).toBe(true);
      expect(mockIpcHandlers.has("mcp:toggleServer")).toBe(true);
    });
  });
});
