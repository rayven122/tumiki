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
import { PERSONAL_PROFILE_MANAGER_URL } from "../manager";
import {
  activateOrganizationProfile,
  activatePersonalProfile,
  resolvePendingProfile,
} from "../../shared/profile-store";

const resetTestState = (): void => {
  mockIpcHandlers.clear();
  storeData.clear();
  vi.clearAllMocks();
  mockStoreDelete.mockImplementation((key: string) => storeData.delete(key));
  mockDbAuthToken.deleteMany.mockResolvedValue({ count: 1 });
  mockGetOAuthManager.mockReturnValue(null);
  setupProfileIpc();
};

describe("profile-store", () => {
  beforeEach(resetTestState);

  test("認証コールバック経由で個人プロファイルを保存する", async () => {
    storeData.set("managerUrl", PERSONAL_PROFILE_MANAGER_URL);
    storeData.set("pendingProfile", "personal");

    // 個人利用の確定は profile IPC ではなく認証コールバック経由で行う。
    const result = await activatePersonalProfile();

    expect(storeData.get("managerUrl")).toBe(PERSONAL_PROFILE_MANAGER_URL);
    expect(storeData.has("pendingProfile")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: "personal",
      organizationProfile: null,
      hasCompletedInitialProfileSetup: true,
    });
  });

  test("認証コールバック経由でも組織利用中は個人利用へ切り替えられない", async () => {
    await activateOrganizationProfile("https://manager.example.com");

    await expect(activatePersonalProfile()).rejects.toThrow(
      "組織利用中は個人利用に切り替えられません",
    );
  });

  test("pendingProfileが無くtumiki.cloudの場合は個人利用として解決する", () => {
    expect(
      resolvePendingProfile(
        undefined,
        PERSONAL_PROFILE_MANAGER_URL,
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("personal");
  });

  test("pendingProfileが無く組織URLがある場合は組織利用として解決する", () => {
    expect(
      resolvePendingProfile(
        undefined,
        "https://manager.example.com",
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("organization");
  });

  test("pendingProfileもmanagerUrlも無い場合はエラーとして解決する", () => {
    expect(
      resolvePendingProfile(undefined, undefined, PERSONAL_PROFILE_MANAGER_URL),
    ).toBe("error");
  });

  test("pendingProfileがpersonalの場合はmanagerUrlより個人指定を優先する", () => {
    expect(
      resolvePendingProfile(
        "personal",
        "https://other.example.com",
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("personal");
  });

  test("pendingProfileがorganizationの場合は組織指定として解決する", () => {
    expect(
      resolvePendingProfile(
        "organization",
        "https://manager.example.com",
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("organization");
  });

  test("pendingProfileがorganizationでも個人URLの場合はエラーとして解決する", () => {
    expect(
      resolvePendingProfile(
        "organization",
        PERSONAL_PROFILE_MANAGER_URL,
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("error");
  });

  test("pendingProfileがpersonalの場合はmanagerUrlが無くても個人指定として解決する", () => {
    expect(
      resolvePendingProfile(
        "personal",
        undefined,
        PERSONAL_PROFILE_MANAGER_URL,
      ),
    ).toBe("personal");
  });
});

describe("setupProfileIpc", () => {
  beforeEach(resetTestState);

  test("初回状態は未設定として返す", async () => {
    const handler = mockIpcHandlers.get("profile:getState");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toStrictEqual({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
  });

  test("セットアップキャンセルで未確定の管理サーバーURLをクリアする", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:cancelPendingSetup");
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

  test("セットアップキャンセル時にプロファイルクリアが失敗した場合はOAuthManagerを停止しない", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    mockStoreDelete.mockImplementationOnce(() => {
      throw new Error("store error");
    });
    storeData.set("managerUrl", "https://manager.example.com");

    const handler = mockIpcHandlers.get("profile:cancelPendingSetup");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "セットアップのキャンセルに失敗しました",
    );

    expect(cancelAuthFlow).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
    expect(mockSetOAuthManager).not.toHaveBeenCalled();
    expect(storeData.get("managerUrl")).toBe("https://manager.example.com");
  });

  test("組織変更キャンセルで既存組織URLを復元しpendingProfileをクリアする", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    storeData.set("activeProfile", "organization");
    storeData.set("organizationProfile", {
      managerUrl: "https://current-manager.example.com",
      connectedAt: "2026-05-18T00:00:00.000Z",
    });
    storeData.set("hasCompletedInitialProfileSetup", true);
    storeData.set("managerUrl", "https://new-manager.example.com");
    storeData.set("pendingProfile", "organization");

    const handler = mockIpcHandlers.get("profile:cancelOrganizationChange");
    const result = await handler!({} as IpcMainInvokeEvent);

    expect(cancelAuthFlow).toHaveBeenCalled();
    expect(stopAutoRefresh).toHaveBeenCalled();
    expect(mockSetOAuthManager).toHaveBeenCalledWith(null);
    expect(storeData.get("managerUrl")).toBe(
      "https://current-manager.example.com",
    );
    expect(storeData.has("pendingProfile")).toBe(false);
    expect(result).toStrictEqual({
      activeProfile: "organization",
      organizationProfile: {
        managerUrl: "https://current-manager.example.com",
        connectedAt: "2026-05-18T00:00:00.000Z",
      },
      hasCompletedInitialProfileSetup: true,
    });
  });

  test("復元できる組織プロファイルが無い場合は組織変更キャンセルを拒否する", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    storeData.set("activeProfile", "personal");
    storeData.set("managerUrl", "https://new-manager.example.com");
    storeData.set("pendingProfile", "organization");

    const handler = mockIpcHandlers.get("profile:cancelOrganizationChange");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "組織変更のキャンセルに失敗しました",
    );

    expect(cancelAuthFlow).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
    expect(mockSetOAuthManager).not.toHaveBeenCalled();
    expect(storeData.get("managerUrl")).toBe("https://new-manager.example.com");
    expect(storeData.get("pendingProfile")).toBe("organization");
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

  test("個人プロファイル中は組織切断を拒否する", async () => {
    const cancelAuthFlow = vi.fn();
    const stopAutoRefresh = vi.fn();
    mockGetOAuthManager.mockReturnValue({ cancelAuthFlow, stopAutoRefresh });
    storeData.set("activeProfile", "personal");
    storeData.set("managerUrl", "https://www.tumiki.cloud");

    const handler = mockIpcHandlers.get("profile:disconnectOrganization");

    await expect(handler!({} as IpcMainInvokeEvent)).rejects.toThrow(
      "組織利用の停止に失敗しました",
    );

    expect(mockDbAuthToken.deleteMany).not.toHaveBeenCalled();
    expect(cancelAuthFlow).not.toHaveBeenCalled();
    expect(stopAutoRefresh).not.toHaveBeenCalled();
    expect(mockSetOAuthManager).not.toHaveBeenCalled();
    expect(storeData.get("activeProfile")).toBe("personal");
    expect(storeData.get("managerUrl")).toBe("https://www.tumiki.cloud");
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
    await activateOrganizationProfile("https://manager.example.com");
    storeData.set("managerUrl", "https://manager.example.com");
    mockStoreDelete.mockImplementationOnce(() => {
      throw new Error("store error");
    });

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
