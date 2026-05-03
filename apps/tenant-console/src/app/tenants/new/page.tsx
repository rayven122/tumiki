"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

/** テナント作成完了後に表示する初期管理者パスワードモーダルの Props */
type InitialAdminPasswordModalProps = {
  email: string;
  password: string;
  onClose: () => void;
};

/** 初期管理者パスワードを一度だけ表示するモーダル */
const InitialAdminPasswordModal = ({
  email,
  password,
  onClose,
}: InitialAdminPasswordModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    // 2秒後にコピー完了表示をリセット
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-gray-900">
          テナントを作成しました
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          初期管理者アカウントが作成されました。このパスワードは一度しか表示されません。
        </p>

        <div className="mb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500">メールアドレス</p>
            <p className="mt-1 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
              {email}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500">仮パスワード</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="flex-1 rounded-md bg-gray-50 px-3 py-2 font-mono text-sm break-all text-gray-900">
                {password}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-md bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
            </div>
          </div>
        </div>

        <p className="mb-4 text-xs text-amber-600">
          ※ 初回ログイン時にパスワードの変更が必要です。
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
  /** 初期管理者パスワードモーダルの表示制御 */
  const [adminPasswordInfo, setAdminPasswordInfo] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const createTenant = api.tenant.create.useMutation({
    onSuccess: (data) => {
      // 初期管理者パスワードが返された場合はモーダルで表示する
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
    <div className="min-h-screen bg-gray-50">
      {/* 初期管理者パスワードモーダル */}
      {adminPasswordInfo && (
        <InitialAdminPasswordModal
          email={adminPasswordInfo.email}
          password={adminPasswordInfo.password}
          onClose={() => router.push("/tenants")}
        />
      )}

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          新規テナント作成
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Infisical プロジェクト作成・シークレット登録・k8s
          リソース作成は自動で実行されます。
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg bg-white p-6 shadow"
        >
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            {slug && (
              <p className="mt-1 text-xs text-gray-500">
                ドメイン: {slug}-manager.tumiki.cloud / Infisicalプロジェクト:
                tumiki-tenant-{slug}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              OIDCタイプ <span className="text-red-500">*</span>
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
                <span>Keycloak (自動連携) - auth.tumiki.cloud</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CUSTOM"
                  checked={oidcType === "CUSTOM"}
                  onChange={() => setOidcType("CUSTOM")}
                  className="mr-2"
                />
                <span>カスタムOIDCプロバイダー</span>
              </label>
            </div>
          </div>

          {/* Keycloak 選択時のみ初期管理者メールアドレスを表示 */}
          {oidcType === "KEYCLOAK" && (
            <div>
              <label
                htmlFor="initialAdminEmail"
                className="block text-sm font-medium text-gray-700"
              >
                初期管理者メールアドレス <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">
                Keycloak に作成される初期管理者ユーザーのメールアドレス
              </p>
              <input
                id="initialAdminEmail"
                type="email"
                value={initialAdminEmail}
                onChange={(e) => setInitialAdminEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {oidcType === "CUSTOM" && (
            <div className="space-y-4 rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700">
                OIDCプロバイダー設定
              </h3>
              <div>
                <label
                  htmlFor="oidcIssuer"
                  className="block text-sm font-medium text-gray-700"
                >
                  Issuer URL <span className="text-red-500">*</span>
                </label>
                <input
                  id="oidcIssuer"
                  type="url"
                  value={oidcIssuer}
                  onChange={(e) => setOidcIssuer(e.target.value)}
                  required
                  placeholder="https://accounts.example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientId"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="oidcClientId"
                  type="text"
                  value={oidcClientId}
                  onChange={(e) => setOidcClientId(e.target.value)}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientSecret"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client Secret <span className="text-red-500">*</span>
                </label>
                <input
                  id="oidcClientSecret"
                  type="password"
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcDesktopClientId"
                  className="block text-sm font-medium text-gray-700"
                >
                  Desktop Client ID <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500">
                  Electron デスクトップアプリ用 PKCE クライアントの ID
                </p>
                <input
                  id="oidcDesktopClientId"
                  type="text"
                  value={oidcDesktopClientId}
                  onChange={(e) => setOidcDesktopClientId(e.target.value)}
                  required
                  autoComplete="off"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="imageTag"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              通常 main を使用。特定バージョンを指定したい場合のみ変更
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/tenants")}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={createTenant.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
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
