"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

/**
 * テナント作成フォーム（Phase 1: Infisical 自動化版）。
 *
 * 入力項目:
 * - slug
 * - oidcType（CUSTOM のみ選択可、KEYCLOAK は Phase 2 で実装予定）
 * - CUSTOM 時のみ: oidcIssuer / oidcClientId / oidcClientSecret
 * - imageTag（任意）
 *
 * 自動処理:
 * - POSTGRES_PASSWORD / AUTH_SECRET の生成
 * - Infisical プロジェクト作成 + シークレット登録 + Identity 紐付け
 * - k8s リソース作成 + helm install
 */
const NewTenantPage = () => {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [oidcType, setOidcType] = useState<"KEYCLOAK" | "CUSTOM">("CUSTOM");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcDesktopClientId, setOidcDesktopClientId] = useState("");
  const [imageTag, setImageTag] = useState("main");
  const [error, setError] = useState<string | null>(null);

  const createTenant = api.tenant.create.useMutation({
    onSuccess: () => {
      router.push("/tenants");
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
              <label className="flex items-center text-gray-400">
                <input
                  type="radio"
                  value="KEYCLOAK"
                  checked={oidcType === "KEYCLOAK"}
                  onChange={() => setOidcType("KEYCLOAK")}
                  disabled
                  className="mr-2"
                />
                <span>Keycloak (自動連携) - Phase 2 で実装予定</span>
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
