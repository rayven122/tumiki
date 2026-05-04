import type { FormEvent, JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import {
  ArrowLeft,
  Building2,
  Check,
  KeyRound,
  Loader2,
  User,
} from "lucide-react";
import { themeAtom } from "../store/atoms";
import { PROFILE_CHANGED_EVENT } from "../../shared/events";

type View = "choice" | "organization";

const getManagerUrlProtocol = (value: string): string | null => {
  try {
    return new URL(value.trim()).protocol;
  } catch {
    return null;
  }
};

export const ProfileSetup = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOrganizationChange = searchParams.get("mode") === "organization";
  const [view, setView] = useState<View>(
    isOrganizationChange ? "organization" : "choice",
  );
  const [managerUrl, setManagerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForCallback, setIsWaitingForCallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const setupCancelledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    window.electronAPI.profile
      .getState()
      .then((state) => {
        if (!mountedRef.current) return;
        if (isOrganizationChange) {
          if (state.activeProfile === "organization") {
            navigate("/settings", { replace: true });
            return;
          }
          setView("organization");
          return;
        }
        if (state.hasCompletedInitialProfileSetup && state.activeProfile) {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError("プロファイル状態の取得に失敗しました");
        }
      });
    window.electronAPI.manager
      .getUrl()
      .then((url) => {
        if (mountedRef.current && url) setManagerUrl(url);
      })
      .catch(() => {
        if (mountedRef.current) {
          setManagerUrl("");
        }
      });

    const cleanupSuccess = window.electronAPI.auth.onCallbackSuccess(() => {
      if (!mountedRef.current || setupCancelledRef.current) return;
      setIsWaitingForCallback(false);
      setIsSubmitting(false);
      window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
      navigate("/", { replace: true });
    });
    const cleanupError = window.electronAPI.auth.onCallbackError((message) => {
      if (!mountedRef.current || setupCancelledRef.current) return;
      setIsWaitingForCallback(false);
      setIsSubmitting(false);
      setError(`ログインに失敗しました: ${message}`);
    });

    return () => {
      mountedRef.current = false;
      cleanupSuccess();
      cleanupError();
    };
  }, [isOrganizationChange, navigate]);

  const selectPersonal = async (): Promise<void> => {
    setupCancelledRef.current = false;
    setIsSubmitting(true);
    setError(null);
    try {
      await window.electronAPI.profile.selectPersonal();
      window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
      navigate("/", { replace: true });
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : "個人利用の設定に失敗しました",
        );
      }
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  const startOrganization = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    const normalizedManagerUrl = managerUrl.trim();
    if (!normalizedManagerUrl) return;

    const protocol = getManagerUrlProtocol(normalizedManagerUrl);
    if (protocol !== "https:" && protocol !== "http:") {
      setError(
        "管理サーバー URL は http:// または https:// で入力してください",
      );
      return;
    }

    setupCancelledRef.current = false;
    setIsSubmitting(true);
    setError(null);
    try {
      await window.electronAPI.manager.connect(normalizedManagerUrl);
      await window.electronAPI.auth.login();
      setIsWaitingForCallback(true);
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : "組織利用の設定に失敗しました",
        );
        setIsWaitingForCallback(false);
        setIsSubmitting(false);
      }
    }
  };

  const managerUrlProtocol = getManagerUrlProtocol(managerUrl);
  const shouldWarnHttp = managerUrlProtocol === "http:";

  const cancelOrganizationSetup = async (): Promise<void> => {
    setupCancelledRef.current = true;
    if (isOrganizationChange) {
      try {
        await window.electronAPI.auth.cancelLogin();
      } finally {
        if (mountedRef.current) {
          setIsSubmitting(false);
          setIsWaitingForCallback(false);
          navigate("/settings", { replace: true });
        }
      }
      return;
    }

    try {
      await window.electronAPI.profile.cancelOrganizationSetup();
      if (mountedRef.current) {
        setError(null);
        setView("choice");
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "組織セットアップのキャンセルに失敗しました",
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
        setIsWaitingForCallback(false);
      }
    }
  };

  return (
    <div
      className={`flex h-screen items-center justify-center bg-[var(--bg-app)] px-6 ${theme === "light" ? "light" : ""}`}
    >
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/tumiki-logo.svg" alt="TUMIKI" className="h-9 w-9" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              TUMIKI Desktop
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              利用プロファイルを設定
            </p>
          </div>
        </div>

        {view === "choice" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void selectPersonal()}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-left transition hover:border-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--bg-active)] text-[var(--text-primary)]">
                <User size={22} />
              </span>
              <span className="mt-5 block text-base font-semibold text-[var(--text-primary)]">
                個人利用
              </span>
              <span className="mt-2 block text-sm leading-6 text-[var(--text-muted)]">
                自分のPC上でMCPコネクタを管理します。組織の承認や監査は使いません。
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                このプロファイルで始める
                <Check size={15} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setView("organization")}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-left transition hover:border-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--bg-active)] text-[var(--text-primary)]">
                <Building2 size={22} />
              </span>
              <span className="mt-5 block text-base font-semibold text-[var(--text-primary)]">
                組織利用
              </span>
              <span className="mt-2 block text-sm leading-6 text-[var(--text-muted)]">
                管理サーバーに接続し、組織のユーザー・承認・監査機能を有効化します。
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                管理サーバーに接続
                <KeyRound size={15} />
              </span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => void startOrganization(e)}
            noValidate
            className="mx-auto max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
          >
            <button
              type="button"
              onClick={() => void cancelOrganizationSetup()}
              disabled={isSubmitting && !isWaitingForCallback}
              className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <ArrowLeft size={15} />
              戻る
            </button>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              組織利用を設定
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              組織利用を有効化すると、停止するまで個人利用には切り替えられません。
            </p>

            <label
              htmlFor="profile-manager-url"
              className="mt-5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              管理サーバー URL
            </label>
            <input
              id="profile-manager-url"
              type="url"
              value={managerUrl}
              onChange={(e) => setManagerUrl(e.target.value)}
              placeholder="https://manager.example.com"
              required
              disabled={isSubmitting}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:ring-2 focus:ring-[var(--btn-primary-bg)] focus:outline-none disabled:opacity-50"
            />

            {shouldWarnHttp && (
              <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-600">
                HTTP 接続は通信内容が暗号化されません。ローカル検証以外では
                HTTPS の管理サーバー URL を使用してください。
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !managerUrl.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2.5 text-sm font-medium text-[var(--btn-primary-text)] transition hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isWaitingForCallback ? "サインイン待機中..." : "接続中..."}
                </>
              ) : (
                "接続してサインイン"
              )}
            </button>
          </form>
        )}

        {error && view === "choice" && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
