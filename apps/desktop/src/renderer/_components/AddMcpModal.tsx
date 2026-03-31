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

  const slug = useMemo(() => toSlug(serverName), [serverName]);

  // API_KEY認証の場合、全キーが入力されているか
  const hasRequiredCredentials =
    catalog.authType !== "API_KEY" ||
    credentialKeys.every((key) => (credentials[key] ?? "").trim() !== "");

  const handleSubmit = async (): Promise<void> => {
    if (!serverName.trim()) {
      setError("サーバー名を入力してください");
      return;
    }

    if (catalog.authType === "API_KEY" && !hasRequiredCredentials) {
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
        className="w-full max-w-lg rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ヘッダー */}
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              APIトークンの設定
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {catalog.name}
              に接続するために必要なAPIトークンを設定してください。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* カタログ情報 */}
        <div className="mb-5 flex items-center gap-3">
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
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {catalog.name}
            </div>
            <span
              className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor:
                  catalog.authType === "NONE"
                    ? "var(--badge-success-bg)"
                    : "var(--badge-warn-bg)",
                color:
                  catalog.authType === "NONE"
                    ? "var(--badge-success-text)"
                    : "var(--badge-warn-text)",
              }}
            >
              {authTypeLabel[catalog.authType]}
            </span>
          </div>
        </div>

        {/* サーバー名入力 */}
        <div className="mb-4">
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            サーバー名
          </label>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
            }}
          />
          <p
            className="mt-1 text-[10px]"
            style={{ color: "var(--text-subtle)" }}
          >
            表示されるサーバー名を設定できます（空白や大文字を含むことができます）
          </p>

          {/* slug表示 */}
          <div
            className="mt-2 flex items-center gap-1 text-[11px]"
            style={{ color: "var(--text-subtle)" }}
          >
            <span>MCPサーバー識別子: {slug || "—"}</span>
            <Info size={12} />
          </div>
        </div>

        {/* APIキー入力（API_KEY認証の場合のみ） */}
        {catalog.authType === "API_KEY" && credentialKeys.length > 0 && (
          <div className="mb-4 space-y-3">
            {credentialKeys.map((key) => (
              <div key={key}>
                <label
                  className="mb-1.5 block text-xs font-medium"
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
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
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
            className="mb-4 rounded-md px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--badge-error-bg)",
              color: "var(--badge-error-text)",
            }}
          >
            {error}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-80"
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
            className="rounded-lg px-6 py-2 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-card)",
            }}
          >
            {loading ? "追加中..." : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
};
