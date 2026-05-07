import type { JSX } from "react";
import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowRight, Plug, Lock } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { AI_CLIENTS, type AiClient } from "../data/ai-clients";
import { cardStyle } from "../utils/theme-styles";
import { toast } from "../_components/Toast";
import { AiClientAutoWriteModal } from "../_components/AiClientAutoWriteModal";
import { useMcpServers } from "../hooks/useMcpServers";
import { useMcpProxyLaunchCommand } from "../hooks/useMcpProxyLaunchCommand";

// 動作確認済みのクライアントのみ自動書き込み対象とする。それ以外は鍵アイコン + 「近日対応予定」表示
const AUTO_WRITE_SUPPORTED_IDS = new Set([
  "claude-desktop",
  "claude-code",
  "cursor",
]);

export const AiIntegrations = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const { servers } = useMcpServers();
  const launchCommand = useMcpProxyLaunchCommand();
  const [activeClient, setActiveClient] = useState<AiClient | null>(null);

  // 有効サーバーのみ書き込み対象として渡す
  // メモ化することで、子モーダルの useEffect([client.id, servers]) を安定させ getPreview IPC の再実行を防ぐ
  const enabledServers = useMemo(
    () => servers.filter((s) => s.isEnabled),
    [servers],
  );

  const handleClick = (client: AiClient): void => {
    if (AUTO_WRITE_SUPPORTED_IDS.has(client.id)) {
      setActiveClient(client);
      return;
    }
    toast.success(`${client.name} へのワンクリック接続は近日対応予定です`);
  };

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
          const supported = AUTO_WRITE_SUPPORTED_IDS.has(client.id);
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => handleClick(client)}
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
                {supported ? (
                  <ArrowRight size={14} className="text-[var(--text-subtle)]" />
                ) : (
                  <span title="近日対応予定">
                    <Lock size={12} className="text-[var(--text-subtle)]" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {client.name}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
                  {supported ? "自動書き込み対応" : "近日対応予定"}
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
        鍵アイコン付きのクライアントは現在自動書き込み未対応です。順次対応予定です。
      </p>

      {/* 自動書き込みモーダル */}
      {activeClient && (
        <AiClientAutoWriteModal
          client={activeClient}
          servers={enabledServers}
          launchCommand={launchCommand}
          theme={theme}
          onClose={() => setActiveClient(null)}
        />
      )}
    </div>
  );
};
