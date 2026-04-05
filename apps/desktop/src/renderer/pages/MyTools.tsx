import type { JSX } from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Server, Plus } from "lucide-react";
import type { McpServerItem } from "../../main/types";
import { cardStyle } from "../utils/theme-styles";

/** MCPサーバーステータス表示 */
const STATUS_CONFIG: Record<
  McpServerItem["serverStatus"],
  { dotClass: string; label: string }
> = {
  RUNNING: { dotClass: "bg-emerald-400", label: "稼働中" },
  STOPPED: { dotClass: "bg-gray-400", label: "停止中" },
  ERROR: { dotClass: "bg-red-400", label: "エラー" },
  PENDING: { dotClass: "bg-amber-400", label: "接続中" },
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
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            コネクト
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            登録済みのMCPサーバーを管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 rounded-lg bg-[var(--btn-primary-bg)] px-3 py-1.5 text-xs font-medium text-[var(--btn-primary-text)] transition-opacity hover:opacity-90"
          >
            <Plus size={12} />
            追加
          </Link>
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-opacity hover:opacity-80"
          >
            カタログ
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* 検索バー */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            type="text"
            placeholder="サーバーを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pr-3 pl-9 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>
      </div>

      {/* MCPサーバー一覧 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--text-subtle)]">
          読み込み中...
        </div>
      ) : filteredServers.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-b-[var(--border)] pb-2">
            <h2 className="text-sm font-medium text-[var(--text-muted)]">
              MCPサーバー
            </h2>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {filteredServers.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {filteredServers.map((server) => {
              const status = STATUS_CONFIG[server.serverStatus];
              return (
                <Link
                  key={server.id}
                  to="/tools/slack"
                  className="flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={cardStyle}
                >
                  {/* アイコン + ステータスドット */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-card-hover)]">
                      <Server size={18} className="text-[var(--text-muted)]" />
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${status.dotClass}`}
                    />
                  </div>

                  {/* サーバー名 */}
                  <div className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                    {server.name}
                  </div>

                  {/* 説明 */}
                  <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-subtle)]">
                    {server.description || server.slug}
                  </div>

                  {/* 接続数 + ステータス */}
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-mono text-[9px] text-[var(--text-subtle)]">
                      {server.connections.length} 接続
                    </span>
                    <span className="rounded bg-[var(--bg-card-hover)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-muted)]">
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center text-[var(--text-subtle)]">
          <Server size={32} />
          <p className="mt-3 text-sm">MCPサーバーがまだ登録されていません</p>
          <Link
            to="/tools/catalog"
            className="mt-4 flex items-center gap-1 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-xs font-medium text-[var(--btn-primary-text)] transition hover:opacity-90"
          >
            <Plus size={14} />
            カタログから追加
          </Link>
        </div>
      )}
    </div>
  );
};
