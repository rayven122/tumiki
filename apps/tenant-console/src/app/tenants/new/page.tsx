"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

type InitialAdminPasswordModalProps = {
  email: string;
  password: string;
  onClose: () => void;
};

const InitialAdminPasswordModal = ({
  email,
  password,
  onClose,
}: InitialAdminPasswordModalProps) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopyError(null);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(
        "クリップボードへのコピーに失敗しました。手動でコピーしてください。",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-bg-card border-border-default mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <h2 className="text-text-primary mb-2 text-lg font-bold">
          テナントを作成しました
        </h2>
        <p className="text-text-secondary mb-4 text-sm">
          初期管理者アカウントが作成されました。このパスワードは一度しか表示されません。
        </p>

        <div className="mb-4 space-y-3">
          <div>
            <p className="text-text-muted text-xs font-medium">
              メールアドレス
            </p>
            <p className="bg-bg-input border-border-default text-text-primary mt-1 rounded-lg border px-3 py-2 text-sm">
              {email}
            </p>
          </div>

          <div>
            <p className="text-text-muted text-xs font-medium">仮パスワード</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="bg-bg-input border-border-default text-text-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm break-all">
                {password}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="border-border-default text-text-secondary shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
            </div>
          </div>
        </div>

        <p className="text-badge-warn-text mb-4 text-xs">
          ※ 初回ログイン時にパスワードの変更が必要です。
        </p>
        {copyError && (
          <p className="bg-badge-error-bg text-badge-error-text mb-4 rounded-lg px-3 py-2 text-xs">
            {copyError}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="bg-btn-primary-bg text-btn-primary-text w-full rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

const NewTenantPage = () => {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [oidcType, setOidcType] = useState<"KEYCLOAK" | "CUSTOM">("KEYCLOAK");
  const [initialAdminEmail, setInitialAdminEmail] = useState("");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcDesktopClientId, setOidcDesktopClientId] = useState("");
  const [imageTag, setImageTag] = useState("main");
  const [error, setError] = useState<string | null>(null);
  const [adminPasswordInfo, setAdminPasswordInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const createTenant = api.tenant.create.useMutation({
    onSuccess: (data) => {
      if (data.initialAdminPassword) {
        setAdminPasswordInfo({
          email: initialAdminEmail,
          password: data.initialAdminPassword,
        });
      } else {
        router.push("/tenants");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    createTenant.mutate({
      slug,
      oidcType,
      initialAdminEmail:
        oidcType === "KEYCLOAK" ? initialAdminEmail : undefined,
      oidcIssuer: oidcType === "CUSTOM" ? oidcIssuer : undefined,
      oidcClientId: oidcType === "CUSTOM" ? oidcClientId : undefined,
      oidcClientSecret: oidcType === "CUSTOM" ? oidcClientSecret : undefined,
      oidcDesktopClientId:
        oidcType === "CUSTOM" ? oidcDesktopClientId : undefined,
      imageTag,
    });
  };

  return (
    <div className="p-6">
      {adminPasswordInfo && (
        <InitialAdminPasswordModal
          email={adminPasswordInfo.email}
          password={adminPasswordInfo.password}
          onClose={() => router.push("/tenants")}
        />
      )}

      <div className="max-w-2xl">
        <h1 className="text-text-primary mb-2 text-lg font-semibold">
          新規テナント作成
        </h1>
        <p className="text-text-secondary mb-6 text-sm">
          Infisical プロジェクト作成・シークレット登録・k8s
          リソース作成は自動で実行されます。
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border-border-default space-y-6 rounded-xl border p-6"
        >
          <div>
            <label
              htmlFor="slug"
              className="text-text-secondary block text-sm font-medium"
            >
              Slug <span className="text-badge-error-text">*</span>
            </label>
            <p className="text-text-muted text-xs">
              小文字英数字とハイフンのみ（2〜50文字）
            </p>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
              minLength={2}
              maxLength={50}
              required
              placeholder="company-a"
              className="bg-bg-input border-border-default text-text-primary placeholder:text-text-subtle focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
            {slug && (
              <p className="text-text-muted mt-1 text-xs">
                ドメイン: {slug}-manager.tumiki.cloud / Infisicalプロジェクト:
                tumiki-tenant-{slug}
              </p>
            )}
          </div>

          <div>
            <label className="text-text-secondary block text-sm font-medium">
              OIDCタイプ <span className="text-badge-error-text">*</span>
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="KEYCLOAK"
                  checked={oidcType === "KEYCLOAK"}
                  onChange={() => setOidcType("KEYCLOAK")}
                  className="mr-2"
                />
                <span className="text-text-secondary text-sm">
                  Keycloak (自動連携) - auth.tumiki.cloud
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CUSTOM"
                  checked={oidcType === "CUSTOM"}
                  onChange={() => setOidcType("CUSTOM")}
                  className="mr-2"
                />
                <span className="text-text-secondary text-sm">
                  カスタムOIDCプロバイダー
                </span>
              </label>
            </div>
          </div>

          {oidcType === "KEYCLOAK" && (
            <div>
              <label
                htmlFor="initialAdminEmail"
                className="text-text-secondary block text-sm font-medium"
              >
                初期管理者メールアドレス{" "}
                <span className="text-badge-error-text">*</span>
              </label>
              <p className="text-text-muted text-xs">
                Keycloak に作成される初期管理者ユーザーのメールアドレス
              </p>
              <input
                id="initialAdminEmail"
                type="email"
                value={initialAdminEmail}
                onChange={(e) => setInitialAdminEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="bg-bg-input border-border-default text-text-primary placeholder:text-text-subtle focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
              />
            </div>
          )}

          {oidcType === "CUSTOM" && (
            <div className="border-border-default bg-bg-input space-y-4 rounded-xl border p-4">
              <h3 className="text-text-primary text-sm font-medium">
                OIDCプロバイダー設定
              </h3>
              <div>
                <label
                  htmlFor="oidcIssuer"
                  className="text-text-secondary block text-sm font-medium"
                >
                  Issuer URL <span className="text-badge-error-text">*</span>
                </label>
                <input
                  id="oidcIssuer"
                  type="url"
                  value={oidcIssuer}
                  onChange={(e) => setOidcIssuer(e.target.value)}
                  required
                  placeholder="https://accounts.example.com"
                  className="bg-bg-card border-border-default text-text-primary placeholder:text-text-subtle focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientId"
                  className="text-text-secondary block text-sm font-medium"
                >
                  Client ID <span className="text-badge-error-text">*</span>
                </label>
                <input
                  id="oidcClientId"
                  type="text"
                  value={oidcClientId}
                  onChange={(e) => setOidcClientId(e.target.value)}
                  required
                  autoComplete="off"
                  className="bg-bg-card border-border-default text-text-primary focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientSecret"
                  className="text-text-secondary block text-sm font-medium"
                >
                  Client Secret <span className="text-badge-error-text">*</span>
                </label>
                <input
                  id="oidcClientSecret"
                  type="password"
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-bg-card border-border-default text-text-primary focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcDesktopClientId"
                  className="text-text-secondary block text-sm font-medium"
                >
                  Desktop Client ID{" "}
                  <span className="text-badge-error-text">*</span>
                </label>
                <p className="text-text-muted text-xs">
                  Electron デスクトップアプリ用 PKCE クライアントの ID
                </p>
                <input
                  id="oidcDesktopClientId"
                  type="text"
                  value={oidcDesktopClientId}
                  onChange={(e) => setOidcDesktopClientId(e.target.value)}
                  required
                  autoComplete="off"
                  className="bg-bg-card border-border-default text-text-primary focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="imageTag"
              className="text-text-secondary block text-sm font-medium"
            >
              internal-manager イメージタグ
            </label>
            <input
              id="imageTag"
              type="text"
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
              pattern="[a-zA-Z0-9._-]+"
              maxLength={128}
              className="bg-bg-input border-border-default text-text-primary focus:border-border-focus mt-1 block w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
            <p className="text-text-muted mt-1 text-xs">
              通常 main を使用。特定バージョンを指定したい場合のみ変更
            </p>
          </div>

          {error && (
            <div className="bg-badge-error-bg text-badge-error-text rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/tenants")}
              className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={createTenant.isPending}
              className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {createTenant.isPending ? "作成中..." : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTenantPage;
