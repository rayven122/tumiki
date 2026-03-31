import type { JSX } from "react";
import { useState } from "react";
import { X } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";

type AddMcpModalProps = {
  catalog: CatalogItem;
  onClose: () => void;
  onSuccess: () => void;
};

export const AddMcpModal = ({
  catalog,
  onClose,
  onSuccess,
}: AddMcpModalProps): JSX.Element => {
  const credentialKeys: string[] = JSON.parse(catalog.credentialKeys);
  const [credentials, setCredentials] = useState<Record<string, string>>(
    Object.fromEntries(credentialKeys.map((key) => [key, ""])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await window.electronAPI.mcp.createFromCatalog({
        catalogId: catalog.id,
        catalogName: catalog.name,
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
        className="w-full max-w-md rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            MCPサーバーを追加
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* カタログ情報 */}
        <div
          className="mb-4 rounded-lg p-3"
          style={{ backgroundColor: "var(--bg-app)" }}
        >
          <div
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {catalog.name}
          </div>
          <div
            className="mt-1 text-[11px]"
            style={{ color: "var(--text-subtle)" }}
          >
            {catalog.description}
          </div>
        </div>

        {/* 認証キー入力（credentialKeysがある場合のみ） */}
        {credentialKeys.length > 0 && (
          <div className="mb-4 space-y-3">
            <div
              className="text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              環境変数の設定（任意）
            </div>
            {credentialKeys.map((key) => (
              <div key={key}>
                <label
                  className="mb-1 block text-[11px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {key}
                </label>
                <input
                  type="text"
                  value={credentials[key] ?? ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={`${key}を入力...`}
                  className="w-full rounded-md px-3 py-2 text-xs outline-none"
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md py-2 text-xs font-medium transition hover:opacity-80"
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
            className="flex-1 rounded-md py-2 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
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
