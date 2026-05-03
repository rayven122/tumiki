import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

const storeData = vi.hoisted(() => new Map<string, unknown>());
const mockStoreDelete = vi.hoisted(() => vi.fn());
const mockDbAuthToken = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}));
const mockGetOAuthManager = vi.hoisted(() => vi.fn());
const mockSetOAuthManager = vi.hoisted(() => vi.fn());

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
      delete: (key: string) => mockStoreDelete(key),
    }),
}));

vi.mock("../../shared/db", () => ({
  getDb: () => Promise.resolve({ authToken: mockDbAuthToken }),
}));

vi.mock("../../auth/manager-registry", () => ({
  getOAuthManager: () => mockGetOAuthManager(),
  setOAuthManager: (manager: unknown) => mockSetOAuthManager(manager),
}));

vi.mock("../../shared/utils/logger");

import { setupProfileIpc } from "../profile";
import { activateOrganizationProfile } from "../../shared/profile-store";

describe("setupProfileIpc", () => {
  beforeEach(() => {
    mockIpcHandlers.clear();
    storeData.clear();
    vi.clearAllMocks();
    mockStoreDelete.mockImplementation((key: string) => storeData.delete(key));
    mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });
    mockGetOAuthManager.mockReturnValue(null);
    setupProfileIpc();
  });

  test("初回状態は未設定として返す", async () => {
    const handler = mockIpcHandlers.get("profile:getState");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toStrictEqual({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
  });

  test("個人利用選択で個人プロファイルを保存する", async () => {
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:selectPersonal");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(storeData.has("managerUrl")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: "personal",
      organizationProfile: null,
      hasCompletedInitialProfileSetup: true,
    });
  });

  test("組織利用中は個人利用へ切り替えられない", async () => {
    await activateOrganizationProfile("https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:selectPersonal");
    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "組織利用中は個人利用に切り替えられません",
    );
  });

  test("組織セットアップキャンセルで未確定の管理サーバーURLをクリアする", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:cancelOrganizationSetup");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(cancelAuthFlow).toHaveBeenCalled();
    expect(stopAutoRefresh).toHaveBeenCalled();
    expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    expect(storeData.has("managerUrl")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
  });

  test("組織セットアップキャンセル時にプロファイルクリアが失敗した場合はOAuthManagerを停止しない", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    mockStoreDelete.mockImplementationOnce(() => {
      throw new Error("store error");
    });
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:cancelOrganizationSetup");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "store error",
    );

    expect(cancelAuthFlow).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
    expect(mockSetOAuthManager).not.toHaveBeenCalled();
    expect(storeData.get("managerUrl")).toBe("https://manager.example.com");
  });

  test("組織切断で認証とプロファイル状態をクリアする", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    await activateOrganizationProfile("https://manager.example.com");
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:disconnectOrganization");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(cancelAuthFlow).toHaveBeenCalled();
    expect(stopAutoRefresh).toHaveBeenCalled();
    expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    expect(mockDbAuthToken.deleteMany).toHaveBeenCalledWith({});
    expect(storeData.has("managerUrl")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
  });

  test("組織切断時にDB削除が失敗してもプロファイル状態はクリアする", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    mockDbAuthToken.deleteMany.mockRejectedValue(new Error("DB error"));
    await activateOrganizationProfile("https://manager.example.com");
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:disconnectOrganization");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(cancelAuthFlow).toHaveBeenCalled();
    expect(stopAutoRefresh).toHaveBeenCalled();
    expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    expect(storeData.has("managerUrl")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
  });

  test("組織切断時にプロファイルクリアが失敗した場合は状態を変更しない", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    mockStoreDelete.mockImplementationOnce(() => {
      throw new Error("store error");
    });
    await activateOrganizationProfile("https://manager.example.com");
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:disconnectOrganization");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "組織利用の停止に失敗しました",
    );

    expect(mockDbAuthToken.deleteMany).not.toHaveBeenCalled();
    expect(cancelAuthFlow).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
    expect(mockSetOAuthManager).not.toHaveBeenCalled();
    expect(storeData.get("managerUrl")).toBe("https://manager.example.com");
    expect(storeData.get("activeProfile")).toBe("organization");
    expect(storeData.get("organizationProfile")).toStrictEqual({
      managerUrl: "https://manager.example.com",
      connectedAt: expect.any(String) as string,
    });
    expect(storeData.get("hasCompletedInitialProfileSetup")).toBe(true);
  });
});
