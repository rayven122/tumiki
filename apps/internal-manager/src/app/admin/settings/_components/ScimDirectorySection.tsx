"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, KeyRound, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tumiki/ui/alert-dialog";
import { api } from "~/trpc/react";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

const directoryTypeOptions = [
  { value: "generic-scim-v2", label: "Generic SCIM v2.0" },
  { value: "azure-scim-v2", label: "Entra ID (Azure AD)" },
  { value: "okta-scim-v2", label: "Okta" },
  { value: "onelogin-scim-v2", label: "OneLogin" },
  { value: "jumpcloud-scim-v2", label: "JumpCloud" },
  { value: "google", label: "Google Workspace (OAuth)" },
] as const;

type DirectoryType = (typeof directoryTypeOptions)[number]["value"];

type NewlyCreated = {
  name: string;
  type: DirectoryType;
  scimEndpoint: string | null;
  scimSecret: string | null;
  googleAuthorizationUrl: string | null;
};

// Google OAuth コールバックのエラーコード（route.ts と対応）→ 表示用日本語
const GOOGLE_CALLBACK_ERROR_LABELS: Record<string, string> = {
  unauthorized: "認証セッションが無効です。再ログインしてください",
  oauth_denied: "Google で認可が拒否されました",
  invalid_request: "認可リクエストに必要なパラメータが不足しています",
  invalid_state: "認可フローの状態が不正です",
  token_exchange_failed: "Google からのトークン取得に失敗しました",
  refresh_token_missing:
    "リフレッシュトークンが取得できませんでした。Google アカウントの「サードパーティアプリのアクセス」で本アプリの認可を取り消してから再度認可してください",
  token_persist_failed: "トークンの保存に失敗しました",
};

/** SCIM Directory 管理セクション（Jackson Directory Sync） */
const ScimDirectorySection = () => {
  const utils = api.useUtils();
  const { data: directories, isLoading } = api.scimDirectory.list.useQuery();
  const searchParams = useSearchParams();
  const callbackSuccess = searchParams.get("scim_success");
  const callbackError = searchParams.get("scim_error");

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DirectoryType>("generic-scim-v2");
  const [created, setCreated] = useState<NewlyCreated | null>(null);
  const [copied, setCopied] = useState<"endpoint" | "secret" | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMutation = api.scimDirectory.create.useMutation({
    onSuccess: (data) => {
      setCreated({
        name: data.name,
        type: data.type,
        scimEndpoint: data.scimEndpoint,
        scimSecret: data.scimSecret,
        googleAuthorizationUrl: data.googleAuthorizationUrl,
      });
      setNewName("");
      void utils.scimDirectory.list.invalidate();
      // Google タイプの場合は自動で OAuth 同意画面へ遷移
      if (data.type === "google" && data.googleAuthorizationUrl) {
        window.location.href = data.googleAuthorizationUrl;
      }
    },
  });

  const deleteMutation = api.scimDirectory.delete.useMutation({
    onSuccess: () => void utils.scimDirectory.list.invalidate(),
  });

  // 注: 1コンポーネントで1インスタンスのため、複数 Google directory が
  // 存在する場合は一方の再認可中に全てのボタンが disabled になる。
  // 現状は単一 Google directory 運用を想定。将来複数対応する場合は
  // pendingReauthId state でディレクトリ単位に管理する。
  const reauthMutation =
    api.scimDirectory.getGoogleAuthorizationUrl.useMutation({
      onSuccess: (data) => {
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        }
      },
    });

  const errorMessage =
    createMutation.error?.message ??
    deleteMutation.error?.message ??
    reauthMutation.error?.message ??
    null;

  const handleCopy = (text: string, kind: "endpoint" | "secret") => {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* OAuth コールバックの成功通知（Google 認可後のリダイレクト時に表示） */}
      {callbackSuccess === "google_authorized" && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
        >
          ✓ Google Workspace の認可が完了しました
        </div>
      )}
      {/* OAuth コールバックのエラー通知 */}
      {callbackError && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          Google 認可エラー:{" "}
          {GOOGLE_CALLBACK_ERROR_LABELS[callbackError] ??
            "不明なエラーが発生しました"}
        </div>
      )}
      {/* ミューテーションエラー表示 */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          エラー: {errorMessage}
        </div>
      )}

      {/* 新規作成済み Directory のインライン表示（一度だけ） */}
      {created && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">
              ✓ Directory「{created.name}」を作成しました
            </span>
            <button
              type="button"
              onClick={() => setCreated(null)}
              aria-label="閉じる"
              className="text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
          {created.type === "google" ? (
            <p className="text-text-muted text-[11px]">
              Google
              の同意画面に遷移します。承認後、自動的にユーザー/グループの同期が始まります。
            </p>
          ) : (
            <>
              <p className="text-text-muted mb-2 text-[11px]">
                SCIM Secret はこの画面でしか表示されません。今すぐコピーして IdP
                の SCIM 設定に登録してください。
              </p>

              <div className="space-y-2">
                <div>
                  <label className="text-text-secondary mb-1 block text-[11px]">
                    SCIM Endpoint URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={created.scimEndpoint ?? ""}
                      readOnly
                      className={`${inputCls} flex-1 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        created.scimEndpoint &&
                        handleCopy(created.scimEndpoint, "endpoint")
                      }
                      className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:opacity-80"
                    >
                      <Copy size={12} />
                      {copied === "endpoint" ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-text-secondary mb-1 block text-[11px]">
                    Bearer Token (Secret)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={created.scimSecret ?? ""}
                      readOnly
                      className={`${inputCls} flex-1 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        created.scimSecret &&
                        handleCopy(created.scimSecret, "secret")
                      }
                      className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:opacity-80"
                    >
                      <Copy size={12} />
                      {copied === "secret" ? "コピー済み" : "コピー"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Directory 一覧 */}
      <div>
        <label className="text-text-secondary mb-1 block text-[11px]">
          SCIM Directory
        </label>
        {isLoading ? (
          <div className="bg-bg-app border-border-default text-text-muted rounded-lg border px-3 py-2 text-xs">
            読み込み中…
          </div>
        ) : !directories || directories.length === 0 ? (
          <div className="bg-bg-app border-border-default text-text-muted rounded-lg border px-3 py-2 text-xs">
            Directory がまだ作成されていません
          </div>
        ) : (
          <div className="space-y-2">
            {directories.map((d) => (
              <div
                key={d.id}
                className="bg-bg-app border-border-default flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-xs">{d.name}</span>
                    {d.deactivated && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                        無効
                      </span>
                    )}
                    {d.type === "google" && d.googleAuthorized === false && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                        未認可
                      </span>
                    )}
                  </div>
                  <div className="text-text-muted font-mono text-[10px] break-all">
                    {d.scimEndpoint ??
                      (d.type === "google"
                        ? "OAuth pull 同期 (Google Workspace Directory)"
                        : "—")}
                  </div>
                </div>
                <span className="text-text-muted rounded-full bg-white/5 px-2 py-0.5 text-[10px]">
                  {d.type}
                </span>
                {d.type === "google" && (
                  <button
                    type="button"
                    onClick={() => reauthMutation.mutate({ id: d.id })}
                    disabled={reauthMutation.isPending}
                    aria-label="Google OAuth 再認可"
                    title="再認可"
                    className="text-text-muted hover:text-text-primary flex h-11 w-11 items-center justify-center disabled:opacity-50"
                  >
                    <KeyRound size={14} />
                  </button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      aria-label="削除"
                      className="flex h-11 w-11 items-center justify-center text-red-400 hover:opacity-80 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Directory「{d.name}」を削除しますか？
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {d.type === "google"
                          ? "Google Cloud Console の OAuth 設定も無効化してください。Tumiki 側の同期済みユーザー/グループは残ります。"
                          : "IdP 側の SCIM 設定も無効化してください。Tumiki 側の同期済みユーザー/グループは残ります。"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate({ id: d.id })}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新規作成フォーム */}
      <div className="border-border-default space-y-2 rounded-lg border p-3">
        <div className="text-text-secondary text-[11px]">新規 Directory</div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="例: Okta Production"
          className={inputCls}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as DirectoryType)}
          className={inputCls}
        >
          {directoryTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            createMutation.mutate({ name: newName.trim(), type: newType })
          }
          disabled={createMutation.isPending || newName.trim().length === 0}
          className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <Plus size={12} />
          {createMutation.isPending ? "作成中…" : "Directory を作成"}
        </button>
      </div>
    </div>
  );
};

export default ScimDirectorySection;
