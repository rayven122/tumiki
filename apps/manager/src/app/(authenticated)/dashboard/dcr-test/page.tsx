"use client";

/**
 * DCR検証ページ
 * Dynamic Client Registrationの動作確認用
 */

import { useState } from "react";
import { api } from "@/trpc/react";

const DcrTestPage = () => {
  const [serverUrl, setServerUrl] = useState("");
  const [serverName, setServerName] = useState("");
  const [scopes, setScopes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: string;
  } | null>(null);

  const createRemoteMcpMutation = api.remoteMcpServer.create.useMutation();

  const handleTest = async () => {
    if (!serverUrl || !serverName) {
      setResult({
        success: false,
        message: "サーバーURLと名前を入力してください",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const scopeArray = scopes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await createRemoteMcpMutation.mutateAsync({
        customUrl: serverUrl,
        name: serverName,
        authType: "OAUTH",
        oauthProvider: "custom",
        scopes: scopeArray.length > 0 ? scopeArray : undefined,
        visibility: "PRIVATE",
      });

      setResult({
        success: true,
        message: "DCR登録に成功しました！OAuth認証を開始します...",
        data: JSON.stringify(response, null, 2),
      });

      // OAuth認証フローを自動的に開始
      if (response.requiresOAuth) {
        // /api/oauth/authorize にPOSTしてauthorization URLを取得
        const authorizeResponse = await fetch("/api/oauth/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mcpServerId: response.mcpServer.id,
            userMcpConfigId: response.userMcpConfigId,
            scopes: scopeArray.length > 0 ? scopeArray : undefined,
          }),
        });

        if (!authorizeResponse.ok) {
          const errorData = (await authorizeResponse.json()) as {
            error?: string;
          };
          throw new Error(
            errorData.error ?? "Failed to initiate OAuth authorization",
          );
        }

        const authorizeData = (await authorizeResponse.json()) as {
          authorizationUrl: string;
        };

        // Authorization URLにリダイレクト
        window.location.href = authorizeData.authorizationUrl;
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "エラーが発生しました",
        data: JSON.stringify(error, null, 2),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">DCR検証ページ</h1>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label
            htmlFor="serverUrl"
            className="block text-sm font-medium text-gray-700"
          >
            サーバーURL <span className="text-red-500">*</span>
          </label>
          <input
            id="serverUrl"
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="serverName"
            className="block text-sm font-medium text-gray-700"
          >
            サーバー名 <span className="text-red-500">*</span>
          </label>
          <input
            id="serverName"
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="My MCP Server"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="scopes"
            className="block text-sm font-medium text-gray-700"
          >
            スコープ（カンマ区切り）
          </label>
          <input
            id="scopes"
            type="text"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            placeholder="openid, profile, email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            例: openid, profile, email
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "登録中..." : "DCR登録テスト"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-6 rounded-lg border p-4 ${
            result.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <h2
            className={`mb-2 text-lg font-semibold ${
              result.success ? "text-green-800" : "text-red-800"
            }`}
          >
            {result.success ? "✓ 成功" : "✗ エラー"}
          </h2>
          <p
            className={`mb-4 ${
              result.success ? "text-green-700" : "text-red-700"
            }`}
          >
            {result.message}
          </p>
          {result.data && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">
                詳細データを表示
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-4 text-sm">
                {result.data}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">使い方</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>
            サーバーURLにDCR対応のOAuthサーバーのベースURLを入力してください
            <br />
            <span className="text-xs text-blue-600">
              例: https://mcp.linear.app, https://mcp.linear.app/sse
              （パス名は自動的に除去されます）
            </span>
          </li>
          <li>サーバー名は任意の名前を指定できます</li>
          <li>スコープは省略可能です（指定しない場合はデフォルトスコープ）</li>
          <li>
            登録ボタンをクリックすると、以下が自動的に実行されます：
            <ol className="mt-1 ml-4 list-decimal space-y-0.5 text-xs">
              <li>
                .well-known/oauth-authorization-serverからメタデータを取得
              </li>
              <li>Dynamic Client Registration（DCR）を実行</li>
              <li>OAuth認証フローを自動開始</li>
              <li>OAuthサーバーの認証画面にリダイレクト</li>
              <li>認証完了後、トークンが自動保存されます</li>
            </ol>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DcrTestPage;
