import type { JSX } from "react";
import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { ArrowRight, Plug } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { AI_CLIENTS } from "../data/ai-clients";
import { cardStyle } from "../utils/theme-styles";
import { toast } from "../_components/Toast";

export const AiIntegrations = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [connectedCountMap, setConnectedCountMap] = useState<
    Record<string, number>
  >({});

  // 接続済み MCP 件数の取得（Phase 4 で実装）。現状はサーバー総数を仮表示。
  useEffect(() => {
    void window.electronAPI.mcp
      .getAll()
      .then((servers) => {
        const total = servers.length;
        setConnectedCountMap(
          Object.fromEntries(AI_CLIENTS.map((c) => [c.id, total])),
        );
      })
      .catch(() => setConnectedCountMap({}));
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-lg bg-[var(--bg-active)] p-2">
          <Plug size={18} className="text-[var(--text-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            AIツール連携
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            MCPサーバーを接続するAIツールを管理します
          </p>
        </div>
      </div>

      {/* AIクライアントカード一覧 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {AI_CLIENTS.map((client) => {
          const logo = client.logoPath?.(theme);
          const count = connectedCountMap[client.id] ?? 0;
          return (
            <button
              key={client.id}
              type="button"
              onClick={() =>
                toast.success(
                  `${client.name} へのワンクリック接続は近日対応予定です`,
                )
              }
              className="flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={cardStyle}
            >
              <div className="flex w-full items-center justify-between">
                {logo ? (
                  <img
                    src={logo}
                    alt={client.name}
                    className="h-10 w-10 rounded-lg"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-active)] text-sm font-bold text-[var(--text-muted)]">
                    {client.name.charAt(0)}
                  </div>
                )}
                <ArrowRight size={14} className="text-[var(--text-subtle)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {client.name}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
                  接続可能なMCPサーバー: {count} 件
                </div>
              </div>
              <code className="w-full truncate rounded bg-[var(--bg-input)] px-2 py-1 font-mono text-[9px] text-[var(--text-subtle)]">
                {client.configTargetPath}
              </code>
            </button>
          );
        })}
      </div>

      {/* 説明補足 */}
      <p className="text-xs text-[var(--text-subtle)]">
        ※
        各AIツールへのワンクリック接続・設定ファイル自動書き込みは近日対応予定です。現在は「コネクト」の各サーバー詳細から設定スニペットをコピーして利用できます。
      </p>
    </div>
  );
};
