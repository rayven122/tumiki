import type { JSX } from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Server, Plus } from "lucide-react";
import type { McpServerItem } from "../../types/mcp";

/** MCPサーバーステータス表示 */
const STATUS_CONFIG: Record<
  McpServerItem["serverStatus"],
  { dotClass: string; label: string; borderStyle: string }
> = {
  RUNNING: {
    dotClass: "bg-emerald-400",
    label: "稼働中",
    borderStyle: "rgba(52, 211, 153, 0.2)",
  },
  STOPPED: {
    dotClass: "bg-gray-400",
    label: "停止中",
    borderStyle: "rgba(113, 113, 122, 0.2)",
  },
  ERROR: {
    dotClass: "bg-red-400",
    label: "エラー",
    borderStyle: "rgba(248, 113, 113, 0.2)",
  },
  PENDING: {
    dotClass: "bg-amber-400",
    label: "接続中",
    borderStyle: "rgba(251, 191, 36, 0.2)",
  },
};

export const MyTools = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.mcp
      .getAll()
      .then(setMcpServers)
      .catch(() => setMcpServers([]))
      .finally(() => setLoading(false));
  }, []);

  const lowerQuery = query.toLowerCase();
  const filteredServers = mcpServers.filter(
    (s) =>
      query === "" ||
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.includes(query),
  );

  return (
    <div className="p-6">
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              コネクト
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {filteredServers.length}件表示
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/tools/catalog"
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              <Plus size={12} />
              追加
            </Link>
            <Link
              to="/tools/catalog"
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              カタログ
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* 検索バー */}
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative min-w-[180px] flex-1">
            <Search
              size={13}
              className="absolute top-1/2 left-2.5 -translate-y-1/2"
              style={{ color: "var(--text-subtle)" }}
            />
            <input
              type="text"
              placeholder="サーバーを検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg py-1.5 pr-3 pl-8 text-xs outline-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* MCPサーバーカードグリッド */}
        {loading ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-subtle)" }}
          >
            読み込み中...
          </div>
        ) : filteredServers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
            {filteredServers.map((server) => {
              const status = STATUS_CONFIG[server.serverStatus];
              return (
                <div
                  key={server.id}
                  className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    border: `1px solid ${status.borderStyle}`,
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  {/* アイコン + ステータスドット */}
                  <div className="mb-3 flex items-start justify-between">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "var(--bg-card-hover)" }}
                    >
                      <Server
                        size={18}
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${status.dotClass}`}
                    />
                  </div>

                  {/* サーバー名 */}
                  <div
                    className="mb-1 text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {server.name}
                  </div>

                  {/* 説明 */}
                  <div
                    className="mb-3 text-[10px] leading-relaxed"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {server.description || server.slug}
                  </div>

                  {/* 接続数 + ステータス */}
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[9px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {server.connections.length} 接続
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[8px] font-medium"
                      style={{
                        backgroundColor: "var(--bg-active)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16">
            <Server size={32} style={{ color: "var(--text-subtle)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--text-subtle)" }}>
              MCPサーバーがまだ登録されていません
            </p>
            <Link
              to="/tools/catalog"
              className="mt-4 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition hover:opacity-90"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              <Plus size={14} />
              カタログから追加
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
