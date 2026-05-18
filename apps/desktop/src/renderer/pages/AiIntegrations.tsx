import type { JSX } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Lock, Plug, Activity } from "lucide-react";
import { AI_CLIENTS, type AiClient } from "../data/ai-clients";
import { cardStyle } from "../utils/theme-styles";
import { toast } from "../_components/Toast";
import { AiClientAutoWriteModal } from "../_components/AiClientAutoWriteModal";
import { useMcpServers } from "../hooks/useMcpServers";
import { useMcpProxyLaunchCommand } from "../hooks/useMcpProxyLaunchCommand";
import {
  useAiCodingToolSettings,
  useOtlpReceiverPort,
} from "../hooks/useAiCodingTelemetry";
import { TRACKING_TOOL_MAP } from "../utils/ai-coding-telemetry-tools";
import type { AiCodingTool } from "../../main/types";

/** 使用量記録が有効なツールに表示するバッジ（フック安定化のためサブコンポーネント化） */
const TrackingBadge = ({
  tool,
}: {
  tool: AiCodingTool;
}): JSX.Element | null => {
  const { settings } = useAiCodingToolSettings(tool);
  if (!settings?.enabled) return null;
  return (
    <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
      <Activity size={8} />
      記録中
    </span>
  );
};

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
  const { servers } = useMcpServers();
  const launchCommand = useMcpProxyLaunchCommand();
  const [activeClient, setActiveClient] = useState<AiClient | null>(null);
  const port = useOtlpReceiverPort();

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
        <div className="mt-1 rounded-lg bg-black/[.06] p-2 dark:bg-white/[.08]">
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
          const logo = client.logoPath?.("light");
          const supported = AUTO_WRITE_SUPPORTED_IDS.has(client.id);
          const trackingTool = TRACKING_TOOL_MAP[client.id];
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => handleClick(client)}
              className={`flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardStyle}`}
            >
              <div className="flex w-full items-center justify-between">
                {logo ? (
                  <div className="flex items-center justify-center overflow-hidden rounded-lg bg-zinc-100/50 p-2">
                    <img
                      src={logo}
                      alt={client.name}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100/50 p-2 text-sm font-bold text-zinc-400 dark:text-zinc-500">
                    {client.name.charAt(0)}
                  </div>
                )}
                {supported ? (
                  <ArrowRight
                    size={14}
                    className="text-gray-400 dark:text-zinc-600"
                  />
                ) : (
                  <span title="近日対応予定">
                    <Lock
                      size={12}
                      className="text-gray-400 dark:text-zinc-600"
                    />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {client.name}
                  </span>
                  {trackingTool !== undefined && (
                    <TrackingBadge tool={trackingTool} />
                  )}
                </div>
                <div className="mt-0.5 text-[10px] text-gray-400 dark:text-zinc-600">
                  {supported ? "自動書き込み対応" : "近日対応予定"}
                </div>
              </div>
              <code className="w-full truncate rounded bg-black/[.02] px-2 py-1 font-mono text-[9px] text-gray-400 dark:bg-white/[.03] dark:text-zinc-600">
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
          port={port}
          onClose={() => setActiveClient(null)}
        />
      )}
    </div>
  );
};
