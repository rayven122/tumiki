import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ProfileState } from "../../../shared/types";

vi.mock("../../_components/Toast", () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const personalProfile: ProfileState = {
  activeProfile: "personal",
  organizationProfile: null,
  hasCompletedInitialProfileSetup: true,
};

const organizationProfile: ProfileState = {
  activeProfile: "organization",
  organizationProfile: {
    managerUrl: "https://manager.example.com",
    connectedAt: "2026-05-19T00:00:00.000Z",
  },
  hasCompletedInitialProfileSetup: true,
};

type MockElectronAPI = {
  profile: { getState: ReturnType<typeof vi.fn> };
  manager: {
    connectPersonal: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };
  auth: { login: ReturnType<typeof vi.fn> };
};

const setupWindow = (profile: ProfileState): MockElectronAPI => {
  const electronAPI: MockElectronAPI = {
    profile: { getState: vi.fn().mockResolvedValue(profile) },
    manager: {
      connectPersonal: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
    },
    auth: { login: vi.fn().mockResolvedValue(undefined) },
  };
  vi.stubGlobal("window", {
    electronAPI,
    dispatchEvent: vi.fn(),
  });
  return electronAPI;
};

const importReloginModule = async (): Promise<
  typeof import("../desktop-relogin")
> => {
  vi.resetModules();
  return import("../desktop-relogin");
};

describe("desktop-relogin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    const { finishDesktopRelogin } = await importReloginModule();
    finishDesktopRelogin();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("進行中の場合は多重起動せずfalseを返す", async () => {
    const electronAPI = setupWindow(personalProfile);
    const { startDesktopRelogin } = await importReloginModule();

    const first = await startDesktopRelogin("期限切れです。");
    const second = await startDesktopRelogin("期限切れです。");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(electronAPI.auth.login).toHaveBeenCalledTimes(1);
  });

  test("プロファイル未設定時は認証を開始しない", async () => {
    const electronAPI = setupWindow({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });
    const { startDesktopRelogin } = await importReloginModule();

    const result = await startDesktopRelogin("期限切れです。");

    expect(result).toBe(false);
    expect(electronAPI.manager.connectPersonal).not.toHaveBeenCalled();
    expect(electronAPI.auth.login).not.toHaveBeenCalled();
  });

  test("個人プロファイルでは個人用Managerへ接続してログインする", async () => {
    const electronAPI = setupWindow(personalProfile);
    const { startDesktopRelogin } = await importReloginModule();

    const result = await startDesktopRelogin("期限切れです。");

    expect(result).toBe(true);
    expect(electronAPI.manager.connectPersonal).toHaveBeenCalled();
    expect(electronAPI.manager.connect).not.toHaveBeenCalled();
    expect(electronAPI.auth.login).toHaveBeenCalled();
  });

  test("組織プロファイルでは保存済みManager URLへ接続してログインする", async () => {
    const electronAPI = setupWindow(organizationProfile);
    const { startDesktopRelogin } = await importReloginModule();

    const result = await startDesktopRelogin("期限切れです。");

    expect(result).toBe(true);
    expect(electronAPI.manager.connect).toHaveBeenCalledWith(
      "https://manager.example.com",
    );
    expect(electronAPI.auth.login).toHaveBeenCalled();
  });

  test("タイムアウト時はイベントをdispatchする", async () => {
    const electronAPI = setupWindow(personalProfile);
    const {
      DESKTOP_RELOGIN_TIMEOUT_EVENT,
      isDesktopReloginInProgress,
      startDesktopRelogin,
    } = await importReloginModule();

    await startDesktopRelogin("期限切れです。");
    expect(isDesktopReloginInProgress()).toBe(true);
    await vi.runOnlyPendingTimersAsync();

    expect(electronAPI.auth.login).toHaveBeenCalled();
    expect(isDesktopReloginInProgress()).toBe(false);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      new Event(DESKTOP_RELOGIN_TIMEOUT_EVENT),
    );
  });

  test("成功時は起動元のハンドラーだけを実行する", async () => {
    const electronAPI = setupWindow(personalProfile);
    const onSuccess = vi.fn();
    const { completeDesktopReloginSuccess, startDesktopRelogin } =
      await importReloginModule();

    await startDesktopRelogin("期限切れです。", { onSuccess });
    const completed = completeDesktopReloginSuccess();

    expect(completed).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(electronAPI.auth.login).toHaveBeenCalled();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  test("進行中の再ログインには後続の起動元ハンドラーを追加する", async () => {
    setupWindow(personalProfile);
    const onSuccess = vi.fn();
    const { completeDesktopReloginSuccess, startDesktopRelogin } =
      await importReloginModule();

    const first = await startDesktopRelogin("期限切れです。");
    const second = await startDesktopRelogin(
      "認証セッションが見つかりません。",
      {
        onSuccess,
      },
    );
    const completed = completeDesktopReloginSuccess();

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(completed).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test("失敗時は起動元のハンドラーだけを実行する", async () => {
    setupWindow(personalProfile);
    const onError = vi.fn();
    const { completeDesktopReloginError, startDesktopRelogin } =
      await importReloginModule();

    await startDesktopRelogin("期限切れです。", { onError });
    const completed = completeDesktopReloginError("認証に失敗しました");

    expect(completed).toBe(true);
    expect(onError).toHaveBeenCalledWith("認証に失敗しました");
  });

  test("タイムアウト時は起動元のハンドラーがあればイベントをdispatchしない", async () => {
    setupWindow(personalProfile);
    const onTimeout = vi.fn();
    const { startDesktopRelogin } = await importReloginModule();

    await startDesktopRelogin("期限切れです。", { onTimeout });
    await vi.runOnlyPendingTimersAsync();

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  test("開始エラー時は進行中フラグをリセットする", async () => {
    const electronAPI = setupWindow(personalProfile);
    electronAPI.manager.connectPersonal.mockRejectedValueOnce(
      new Error("connect failed"),
    );
    const { startDesktopRelogin } = await importReloginModule();
    const { toast } = await import("../../_components/Toast");

    await expect(startDesktopRelogin("期限切れです。")).rejects.toThrow(
      "connect failed",
    );
    expect(toast.error).not.toHaveBeenCalled();
    await expect(startDesktopRelogin("期限切れです。")).resolves.toBe(true);
  });
});
