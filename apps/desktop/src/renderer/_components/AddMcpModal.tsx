import type { JSX } from "react";
import { useState, useMemo } from "react";
import { X, Info } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";

type AddMcpModalProps = {
  catalog: CatalogItem;
  onClose: () => void;
  onSuccess: () => void;
};

/** 認証種別ラベル */
const authTypeLabel: Record<CatalogItem["authType"], string> = {
  NONE: "設定不要",
  BEARER: "Bearer",
  API_KEY: "API Key",
  OAUTH: "OAuth",
};

/** 名前からslugを生成 */
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const AddMcpModal = ({
  catalog,
  onClose,
  onSuccess,
}: AddMcpModalProps): JSX.Element => {
  const credentialKeys: string[] = JSON.parse(catalog.credentialKeys);
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
      await window.electronAPI.mcp.createFromCatalog({
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
      onSuccess();
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
            APIトークンの設定
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
          {catalog.name}
          に接続するために必要なAPIトークンを設定してください。
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
          <div
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              MCPサーバー識別子: {slug || "—"}
            </span>
            <Info size={14} style={{ color: "var(--text-subtle)" }} />
          </div>
          {/* ツールチップ（ホバーで表示） */}
          {showSlugInfo && (
            <div
              className="absolute bottom-full left-1/2 z-10 mb-2 w-80 -translate-x-1/2 rounded-lg px-4 py-3 text-xs shadow-lg"
              style={{
                backgroundColor: "var(--text-primary)",
                color: "var(--bg-card)",
              }}
            >
              <div className="mb-1.5 font-semibold">
                MCPサーバー識別子の用途
              </div>
              <ul className="list-inside list-disc space-y-1">
                <li>ツール名の接頭辞として使用（例:{slug}__tool_name）</li>
                <li>
                  設定ファイルのキーとして使用（Claude Desktop、Cursor等）
                </li>
              </ul>
              {/* 矢印 */}
              <div
                className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2"
                style={{
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid var(--text-primary)",
                }}
              />
            </div>
          )}
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
