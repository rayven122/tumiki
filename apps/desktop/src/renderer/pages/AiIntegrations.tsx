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

const AUTO_WRITE_SUPPORTED_IDS = new Set([
  "claude-desktop",
  "claude-code",
  "cursor",
  "windsurf",
  "cline",
  "roo-code",
  "gemini-cli",
  "vscode",
  "zed",
  "codex-cli",
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
        <div className="mt-1 rounded-lg bg-black/[.06] dark:bg-white/[.08] p-2">
          <Plug size={18} className="text-gray-900 dark:text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AIツール連携
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
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
              className={`flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardStyle}`}
            >
              <div className="flex w-full items-center justify-between">
                {logo ? (
                  <img
                    src={logo}
                    alt={client.name}
                    className="h-10 w-10 rounded-lg"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/[.06] dark:bg-white/[.08] text-sm font-bold text-gray-500 dark:text-zinc-500">
                    {client.name.charAt(0)}
                  </div>
                )}
                {supported ? (
                  <ArrowRight size={14} className="text-gray-400 dark:text-zinc-600" />
                ) : (
                  <span title="近日対応予定">
                    <Lock size={12} className="text-gray-400 dark:text-zinc-600" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {client.name}
                </div>
                <div className="mt-0.5 text-[10px] text-gray-400 dark:text-zinc-600">
                  {supported ? "自動書き込み対応" : "近日対応予定"}
                </div>
              </div>
              <code className="w-full truncate rounded bg-black/[.02] dark:bg-white/[.03] px-2 py-1 font-mono text-[9px] text-gray-400 dark:text-zinc-600">
                {client.configTargetPath}
              </code>
            </button>
          );
        })}
      </div>

      {/* 説明補足 */}
      <p className="text-xs text-gray-400 dark:text-zinc-600">
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
