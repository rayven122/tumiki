import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

const storeData = vi.hoisted(() => new Map<string, unknown>());

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

vi.mock("../../shared/app-store", () => ({
  getAppStore: () =>
    Promise.resolve({
      get: (key: string) => storeData.get(key),
      set: (key: string, value: unknown) => storeData.set(key, value),
      delete: (key: string) => storeData.delete(key),
    }),
}));

vi.mock("../../shared/utils/logger");

import { PERSONAL_PROFILE_MANAGER_URL, setupManagerIpc } from "../manager";

describe("setupManagerIpc", () => {
  const initOAuthManager = vi.fn();

  beforeEach(() => {
    mockIpcHandlers.clear();
    storeData.clear();
    vi.clearAllMocks();
    initOAuthManager.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            issuer: "https://issuer.example.com",
            clientId: "desktop-client",
          }),
      }),
    );
    setupManagerIpc(initOAuthManager);
  });

  test("URL検証とOIDC設定取得後にOAuthManagerを初期化しURLを保存する", async () => {
    const handler = mockIpcHandlers.get("manager:connect");

    await handler!({} as IpcMainInvokeEvent, "https://manager.example.com");

    expect(fetch).toHaveBeenCalledWith(
      "https://manager.example.com/api/auth/config",
      { signal: expect.any(AbortSignal) },
    );
    expect(initOAuthManager).toHaveBeenCalledWith(
      "https://manager.example.com",
      "https://issuer.example.com",
      "desktop-client",
    );
    expect(storeData.get("managerUrl")).toBe("https://manager.example.com");
    expect(storeData.get("pendingProfile")).toBe("organization");
    expect(storeData.get("activeProfile")).toBeUndefined();
    expect(storeData.get("organizationProfile")).toBeUndefined();
    expect(storeData.get("hasCompletedInitialProfileSetup")).toBeUndefined();
  });

  test("管理サーバーURLの末尾スラッシュを除去して保存する", async () => {
    const handler = mockIpcHandlers.get("manager:connect");

    await handler!({} as IpcMainInvokeEvent, "https://manager.example.com/");

    expect(fetch).toHaveBeenCalledWith(
      "https://manager.example.com/api/auth/config",
      { signal: expect.any(AbortSignal) },
    );
    expect(initOAuthManager).toHaveBeenCalledWith(
      "https://manager.example.com",
      "https://issuer.example.com",
      "desktop-client",
    );
    expect(storeData.get("managerUrl")).toBe("https://manager.example.com");
  });

  test("個人プロファイル用の接続ではtumiki.cloudを使いpendingProfileをpersonalとして保存する", async () => {
    const handler = mockIpcHandlers.get("manager:connectPersonal");

    await handler!({} as IpcMainInvokeEvent);

    expect(fetch).toHaveBeenCalledWith(
      `${PERSONAL_PROFILE_MANAGER_URL}/api/auth/config`,
      { signal: expect.any(AbortSignal) },
    );
    expect(initOAuthManager).toHaveBeenCalledWith(
      PERSONAL_PROFILE_MANAGER_URL,
      "https://issuer.example.com",
      "desktop-client",
    );
    expect(storeData.get("managerUrl")).toBe(PERSONAL_PROFILE_MANAGER_URL);
    expect(storeData.get("pendingProfile")).toBe("personal");
  });

  test("接続失敗時はプロファイル状態を確定しない", async () => {
    initOAuthManager.mockRejectedValue(new Error("init failed"));
    const handler = mockIpcHandlers.get("manager:connect");

    await expect(
      handler!({} as IpcMainInvokeEvent, "https://manager.example.com"),
    ).rejects.toThrow("init failed");

    expect(storeData.get("managerUrl")).toBeUndefined();
    expect(storeData.get("pendingProfile")).toBeUndefined();
    expect(storeData.get("activeProfile")).toBeUndefined();
    expect(storeData.get("organizationProfile")).toBeUndefined();
    expect(storeData.get("hasCompletedInitialProfileSetup")).toBeUndefined();
  });

  test("OIDC設定取得に失敗した場合はエラーをスローする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      }),
    );
    const handler = mockIpcHandlers.get("manager:connect");

    await expect(
      handler!({} as IpcMainInvokeEvent, "https://manager.example.com"),
    ).rejects.toThrow("OIDC設定の取得に失敗しました（503）");

    expect(storeData.get("managerUrl")).toBeUndefined();
    expect(storeData.get("pendingProfile")).toBeUndefined();
  });

  test("個人プロファイル接続失敗時はpendingProfileを保存しない", async () => {
    initOAuthManager.mockRejectedValue(new Error("init failed"));
    const handler = mockIpcHandlers.get("manager:connectPersonal");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "init failed",
    );

    expect(storeData.get("managerUrl")).toBeUndefined();
    expect(storeData.get("pendingProfile")).toBeUndefined();
    expect(storeData.get("activeProfile")).toBeUndefined();
    expect(storeData.get("organizationProfile")).toBeUndefined();
    expect(storeData.get("hasCompletedInitialProfileSetup")).toBeUndefined();
  });

  test("無効なURLは拒否する", async () => {
    const handler = mockIpcHandlers.get("manager:connect");

    await expect(handler!({} as IpcMainInvokeEvent, "not-url")).rejects.toThrow(
      "管理サーバーURLはhttp://またはhttps://で指定してください",
    );
  });

  test("httpの管理サーバーURLも接続を許可する", async () => {
    const handler = mockIpcHandlers.get("manager:connect");

    await handler!({} as IpcMainInvokeEvent, "http://localhost:3101");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3101/api/auth/config",
      {
        signal: expect.any(AbortSignal),
      },
    );
    expect(storeData.get("managerUrl")).toBe("http://localhost:3101");
  });

  test("http/https以外のURLは拒否する", async () => {
    const handler = mockIpcHandlers.get("manager:connect");

    await expect(
      handler!({} as IpcMainInvokeEvent, "ftp://manager.example.com"),
    ).rejects.toThrow(
      "管理サーバーURLはhttp://またはhttps://で指定してください",
    );
  });
});
