import { toast } from "../_components/Toast";
import { AUTH_SESSION_TIMEOUT_MS } from "../../shared/types";
import { PROFILE_CHANGED_EVENT } from "../../shared/events";

let reloginInProgress = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

type DesktopReloginHandlers = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onTimeout?: () => void;
  showStartToast?: boolean;
};

let activeHandlers: DesktopReloginHandlers[] = [];

export const DESKTOP_RELOGIN_TIMEOUT_EVENT = "desktop-relogin-timeout";

export const isDesktopReloginInProgress = (): boolean => reloginInProgress;

const clearReloginTimeout = (): void => {
  if (!timeoutId) return;
  clearTimeout(timeoutId);
  timeoutId = null;
};

export const finishDesktopRelogin = (): void => {
  clearReloginTimeout();
  reloginInProgress = false;
  activeHandlers = [];
};

export const completeDesktopReloginSuccess = (): boolean => {
  if (!reloginInProgress) return false;
  const handlers = activeHandlers;
  finishDesktopRelogin();

  const successHandlers = handlers
    .map((handler) => handler.onSuccess)
    .filter((handler): handler is () => void => Boolean(handler));
  if (successHandlers.length > 0) {
    successHandlers.forEach((handler) => handler());
    return true;
  }

  toast.success("再ログインしました");
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  return true;
};

export const completeDesktopReloginError = (message: string): boolean => {
  if (!reloginInProgress) return false;
  const handlers = activeHandlers;
  finishDesktopRelogin();

  const errorHandlers = handlers
    .map((handler) => handler.onError)
    .filter((handler): handler is (message: string) => void =>
      Boolean(handler),
    );
  if (errorHandlers.length > 0) {
    errorHandlers.forEach((handler) => handler(message));
    return true;
  }

  toast.error(message);
  return true;
};

export const startDesktopRelogin = async (
  reason: string,
  handlers: DesktopReloginHandlers = {},
): Promise<boolean> => {
  if (reloginInProgress) {
    activeHandlers.push(handlers);
    return false;
  }
  reloginInProgress = true;
  activeHandlers = [handlers];

  try {
    const profile = await window.electronAPI.profile.getState();
    if (!profile.hasCompletedInitialProfileSetup || !profile.activeProfile) {
      finishDesktopRelogin();
      return false;
    }

    if (handlers.showStartToast !== false) {
      toast.warning(`${reason} 外部ブラウザで再ログインを開始します`);
    }

    if (profile.activeProfile === "personal") {
      await window.electronAPI.manager.connectPersonal();
    } else {
      const managerUrl = profile.organizationProfile?.managerUrl;
      if (!managerUrl) {
        throw new Error("管理サーバーURLが設定されていません");
      }
      await window.electronAPI.manager.connect(managerUrl);
    }

    clearReloginTimeout();
    timeoutId = setTimeout(() => {
      const timeoutHandlers = activeHandlers;
      finishDesktopRelogin();
      const customTimeoutHandlers = timeoutHandlers
        .map((handler) => handler.onTimeout)
        .filter((handler): handler is () => void => Boolean(handler));
      if (customTimeoutHandlers.length > 0) {
        customTimeoutHandlers.forEach((handler) => handler());
      } else {
        toast.error(
          "再ログインがタイムアウトしました。もう一度実行してください",
        );
        window.dispatchEvent(new Event(DESKTOP_RELOGIN_TIMEOUT_EVENT));
      }
    }, AUTH_SESSION_TIMEOUT_MS);

    await window.electronAPI.auth.login();
    return true;
  } catch (error) {
    finishDesktopRelogin();
    throw error;
  }
};
