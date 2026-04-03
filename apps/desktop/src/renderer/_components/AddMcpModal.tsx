import type { JSX } from "react";
import { useState, useMemo } from "react";
import { X, Info } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";

type AddMcpModalProps = {
  catalog: CatalogItem;
  onClose: () => void;
  onSuccess: (serverName: string) => void;
};

/** 認証種別ラベル */
const authTypeLabel: Record<CatalogItem["authType"], string> = {
  NONE: "設定不要",
  BEARER: "Bearer",
  API_KEY: "API Key",
  OAUTH: "OAuth",
};

import { toSlug } from "../../shared/mcp.slug";

export const AddMcpModal = ({
  catalog,
  onClose,
  onSuccess,
}: AddMcpModalProps): JSX.Element => {
  const credentialKeys: string[] = (() => {
    try {
      const parsed: unknown = JSON.parse(catalog.credentialKeys);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  })();
  const [serverName, setServerName] = useState(catalog.name);
  const [credentials, setCredentials] = useState<Record<string, string>>(
    Object.fromEntries(credentialKeys.map((key) => [key, ""])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSlugInfo, setShowSlugInfo] = useState(false);

  const slug = useMemo(() => toSlug(serverName), [serverName]);

  const needsApiKey =
    catalog.authType === "API_KEY" && credentialKeys.length > 0;

  const hasRequiredCredentials =
    !needsApiKey ||
    credentialKeys.every((key) => (credentials[key] ?? "").trim() !== "");

  const handleSubmit = async (): Promise<void> => {
    if (!serverName.trim()) {
      setError("サーバー名を入力してください");
      return;
    }

    if (!hasRequiredCredentials) {
      setError("すべてのAPIキーを入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.mcp.createFromCatalog({
        catalogId: catalog.id,
        catalogName: serverName,
        description: catalog.description,
        transportType: catalog.transportType,
        command: catalog.command,
        args: catalog.args,
        url: catalog.url,
        credentialKeys,
        credentials,
        authType: catalog.authType,
      });
      onSuccess(result.serverName);
    } catch {
      setError("MCPサーバーの登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* タイトル + 閉じるボタン */}
        <div className="mb-1 flex items-start justify-between">
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {catalog.authType === "NONE"
              ? "MCPサーバーの追加"
              : "APIトークンの設定"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 説明文 */}
        <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
          {catalog.authType === "NONE"
            ? `${catalog.name}をMCPサーバーとして追加します。`
            : `${catalog.name}に接続するために必要なAPIトークンを設定してください。`}
        </p>

        {/* アイコン + 名前 + 認証バッジ */}
        <div className="mb-6 flex items-center gap-3">
          {catalog.iconPath ? (
            <img
              src={catalog.iconPath}
              alt={catalog.name}
              className="h-10 w-10 rounded-lg"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xs"
              style={{
                backgroundColor: "var(--bg-card-hover)",
                color: "var(--text-muted)",
              }}
            >
              MCP
            </div>
          )}
          <div>
            <div
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {catalog.name}
            </div>
            <span
              className="mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {authTypeLabel[catalog.authType]}
            </span>
          </div>
        </div>

        {/* サーバー名 */}
        <div className="mb-2">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            サーバー名
          </label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
            }}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            表示されるサーバー名を設定できます（空白や大文字を含むことができます）
          </p>
        </div>

        {/* MCP識別子 */}
        <div
          className="relative mb-6"
          onMouseEnter={() => setShowSlugInfo(true)}
          onMouseLeave={() => setShowSlugInfo(false)}
        >
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-lg px-4 py-3 transition-colors"
            style={{
              backgroundColor: showSlugInfo
                ? "var(--bg-active)"
                : "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              MCPサーバー識別子:
            </span>
            <span
              className="font-mono text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {slug || "—"}
            </span>
            <Info
              size={14}
              className="ml-auto flex-shrink-0"
              style={{ color: "var(--text-subtle)" }}
            />
          </button>
          {/* ツールチップ（ホバーでフェードイン、top-start配置） */}
          <div
            className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-80 rounded-lg px-4 py-3 text-xs shadow-lg transition-all duration-150"
            style={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              opacity: showSlugInfo ? 1 : 0,
              transform: showSlugInfo ? "translateY(0)" : "translateY(4px)",
            }}
          >
            <div className="mb-1.5 font-semibold text-white">
              MCPサーバー識別子の用途
            </div>
            <ul className="list-inside list-disc space-y-1 text-gray-300">
              <li>ツール名の接頭辞として使用（例:{slug}__tool_name）</li>
              <li>設定ファイルのキーとして使用（Claude Desktop、Cursor等）</li>
            </ul>
            {/* 矢印 */}
            <div
              className="absolute top-full left-6 h-0 w-0"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid #111827",
              }}
            />
          </div>
        </div>

        {/* APIキー入力（API_KEY認証の場合のみ） */}
        {needsApiKey && (
          <div className="mb-6 space-y-4">
            {credentialKeys.map((key) => (
              <div key={key}>
                <label
                  className="mb-2 block text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {key}
                </label>
                <input
                  type="password"
                  value={credentials[key] ?? ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={`${key}を入力...`}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-2.5 text-xs"
            style={{
              backgroundColor: "var(--badge-error-bg)",
              color: "var(--badge-error-text)",
            }}
          >
            {error}
          </div>
        )}

        {/* 区切り線 */}
        <div
          className="mb-5"
          style={{
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--border)",
          }}
        />

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg px-6 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-card)",
            }}
          >
            {loading
              ? "追加中..."
              : catalog.authType === "NONE"
                ? "追加"
                : "認証"}
          </button>
        </div>
      </div>
    </div>
  );
};
