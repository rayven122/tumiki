import { describe, test, expect, vi, beforeEach } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

vi.mock("electron", () => ({
  app: { getPath: vi.fn().mockReturnValue("/tmp") },
  ipcMain: {
    handle: (
      channel: string,
      handler: (
        event: IpcMainInvokeEvent,
        ...args: unknown[]
      ) => Promise<unknown>,
    ) => {
      mockIpcHandlers.set(channel, handler);
    },
  },
}));

vi.mock("../../../shared/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const mockSyncMcpPolicies = vi.hoisted(() => vi.fn());
vi.mock("../mcp-policy-sync.service", () => ({
  syncMcpPolicies: mockSyncMcpPolicies,
}));

import { setupMcpPolicySyncIpc } from "../mcp-policy-sync.ipc";

const callHandler = (channel: string) => {
  const handler = mockIpcHandlers.get(channel);
  if (!handler) throw new Error(`Handler not registered: ${channel}`);
  return handler({} as IpcMainInvokeEvent);
};

describe("setupMcpPolicySyncIpc", () => {
  beforeEach(() => {
    mockIpcHandlers.clear();
    mockSyncMcpPolicies.mockResolvedValue({
      created: 1,
      updated: 0,
      failed: 0,
    });
    setupMcpPolicySyncIpc();
  });

  test("mcpPolicySync:sync ハンドラーが登録される", () => {
    expect(mockIpcHandlers.has("mcpPolicySync:sync")).toBe(true);
  });

  test("同期成功時はsyncMcpPoliciesの結果を返す", async () => {
    const result = await callHandler("mcpPolicySync:sync");

    expect(result).toStrictEqual({ created: 1, updated: 0, failed: 0 });
  });

  test("syncMcpPoliciesが失敗した場合はエラーを再スローする", async () => {
    const syncError = new Error("接続に失敗しました");
    mockSyncMcpPolicies.mockRejectedValue(syncError);

    await expect(callHandler("mcpPolicySync:sync")).rejects.toThrow(
      "接続に失敗しました",
    );
  });
});
