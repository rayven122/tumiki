"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

// テナント作成フォームページ
const NewTenantPage = () => {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [oidcType, setOidcType] = useState<"KEYCLOAK" | "CUSTOM">("KEYCLOAK");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [infisicalClientId, setInfisicalClientId] = useState("");
  const [infisicalClientSecret, setInfisicalClientSecret] = useState("");
  const [infisicalProjectSlug, setInfisicalProjectSlug] = useState("");
  const [imageTag, setImageTag] = useState("latest");
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
      infisicalClientId,
      infisicalClientSecret,
      infisicalProjectSlug,
      imageTag,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          新規テナント作成
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg bg-white p-6 shadow"
        >
          {/* Slug */}
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
                ドメイン: {slug}-manager.tumiki.cloud
              </p>
            )}
          </div>

          {/* OIDCタイプ */}
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
                <span className="text-sm text-gray-700">
                  KEYCLOAK（tumiki-keycloak で自動プロビジョニング）
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
                <span className="text-sm text-gray-700">
                  CUSTOM（テナント独自のOIDCプロバイダー）
                </span>
              </label>
            </div>
          </div>

          {/* CUSTOM OIDCの場合のみ表示 */}
          {oidcType === "CUSTOM" && (
            <div className="space-y-4 rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">OIDC設定</p>
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
                  required={oidcType === "CUSTOM"}
                  placeholder="https://your-oidc-provider.example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientId"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client ID
                </label>
                <input
                  id="oidcClientId"
                  type="text"
                  value={oidcClientId}
                  onChange={(e) => setOidcClientId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="oidcClientSecret"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client Secret
                </label>
                <input
                  id="oidcClientSecret"
                  type="password"
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Infisical認証情報 */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Infisical認証情報
            </p>
            <div>
              <label
                htmlFor="infisicalClientId"
                className="block text-sm font-medium text-gray-700"
              >
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                id="infisicalClientId"
                type="text"
                value={infisicalClientId}
                onChange={(e) => setInfisicalClientId(e.target.value)}
                required
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="infisicalClientSecret"
                className="block text-sm font-medium text-gray-700"
              >
                Client Secret <span className="text-red-500">*</span>
              </label>
              <input
                id="infisicalClientSecret"
                type="password"
                value={infisicalClientSecret}
                onChange={(e) => setInfisicalClientSecret(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="infisicalProjectSlug"
                className="block text-sm font-medium text-gray-700"
              >
                Project Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="infisicalProjectSlug"
                type="text"
                value={infisicalProjectSlug}
                onChange={(e) => setInfisicalProjectSlug(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* イメージタグ */}
          <div>
            <label
              htmlFor="imageTag"
              className="block text-sm font-medium text-gray-700"
            >
              イメージタグ
            </label>
            <input
              id="imageTag"
              type="text"
              value={imageTag}
              onChange={(e) => setImageTag(e.target.value)}
              placeholder="latest"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createTenant.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              {createTenant.isPending ? "作成中..." : "テナントを作成"}
            </button>
            <a
              href="/tenants"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              キャンセル
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTenantPage;
