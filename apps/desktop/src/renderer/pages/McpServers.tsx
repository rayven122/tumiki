import type { JSX } from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Server, Plus } from "lucide-react";
import type { McpServerItem } from "../../main/types";
import { cardStyle } from "../utils/theme-styles";

/** サーバーステータスの表示設定 */
const statusConfig: Record<
  McpServerItem["serverStatus"],
  { dotClass: string; label: string }
> = {
  RUNNING: { dotClass: "bg-emerald-400", label: "稼働中" },
  STOPPED: { dotClass: "bg-gray-400", label: "停止中" },
  ERROR: { dotClass: "bg-red-400", label: "エラー" },
  PENDING: { dotClass: "bg-amber-400", label: "接続中" },
};

export const McpServers = (): JSX.Element => {
  const [servers, setServers] = useState<McpServerItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadServers = (): void => {
    window.electronAPI.mcp
      .getAll()
      .then(setServers)
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadServers();
  }, []);

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "var(--text-subtle)" }}
      >
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            MCPサーバー
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            登録済みのMCPサーバーを管理
          </p>
        </div>
        <Link
          to="/tools/catalog"
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition hover:opacity-90"
          style={{
            backgroundColor: "var(--text-primary)",
            color: "var(--bg-card)",
          }}
        >
          <Plus size={14} />
          カタログから追加
        </Link>
      </div>

      {/* サーバー一覧 */}
      {servers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {servers.map((server) => {
            const status = statusConfig[server.serverStatus];
            return (
              <div
                key={server.id}
                className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={cardStyle}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "var(--bg-card-hover)" }}
                    >
                      <Server
                        size={20}
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {server.name}
                      </div>
                      <div
                        className="mt-0.5 text-[10px]"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {server.description || server.slug}
                      </div>
                    </div>
                  </div>
                  {/* ステータス */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${status.dotClass}`}
                    />
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
                {/* 接続数 */}
                <div
                  className="mt-3 text-[10px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {server.connections.length} 接続
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-xl py-16"
          style={cardStyle}
        >
          <Server size={32} style={{ color: "var(--text-subtle)" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-subtle)" }}>
            MCPサーバーがまだ登録されていません
          </p>
          <Link
            to="/tools/catalog"
            className="mt-4 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition hover:opacity-90"
            style={{
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-card)",
            }}
          >
            <Plus size={14} />
            カタログから追加
          </Link>
        </div>
      )}
    </div>
  );
};
