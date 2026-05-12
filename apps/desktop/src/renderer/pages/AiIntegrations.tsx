import type { JSX } from "react";
import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import {
  ArrowRight,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Loader2,
  Lock,
  Plug,
} from "lucide-react";
import { themeAtom } from "../store/atoms";
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
import type { AiCodingTool } from "../../main/types";

const TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};

/** ツール別設定カード */
const ToolSettingCard = ({
  tool,
  port,
}: {
  tool: AiCodingTool;
  port: number;
}): JSX.Element => {
  const { settings, isLoading, refresh } = useAiCodingToolSettings(tool);
  const [isApplying, setIsApplying] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const handleToggle = (): void => {
    const newEnabled = !(settings?.enabled ?? false);
    void window.electronAPI.aiCodingTelemetry
      .saveToolEnabled(tool, newEnabled)
      .then(() => refresh());
  };

  const handleApply = (): void => {
    if (port === 0) {
      toast.error("OTLP レシーバーが起動していません");
      return;
    }
    setIsApplying(true);
    void window.electronAPI.aiCodingTelemetry
      .applyToTool(tool, port)
      .then((result) => {
        if (result.success) {
          toast.success(`${TOOL_LABELS[tool]} の設定ファイルに書き込みました`);
          refresh();
        } else {
          toast.error(
            `設定の書き込みに失敗しました: ${result.errorCode ?? "UNKNOWN"}`,
          );
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`設定の書き込みに失敗しました: ${message}`);
      })
      .finally(() => {
        setIsApplying(false);
      });
  };

  // 手動設定用コマンド
  const commands =
    tool === "claude-code"
      ? `export CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`
      : `export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(commands).then(() => {
      toast.success("コマンドをコピーしました");
    });
  };

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {TOOL_LABELS[tool]}
          </p>
          {settings?.appliedAt && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              適用済み:{" "}
              {new Date(settings.appliedAt).toLocaleDateString("ja-JP")}
              {settings.appliedPort !== undefined &&
                ` (port: ${settings.appliedPort})`}
            </p>
          )}
        </div>
        {!isLoading && (
          <button
            type="button"
            role="switch"
            aria-checked={settings?.enabled ?? false}
            aria-label={`${TOOL_LABELS[tool]} のテレメトリを有効化`}
            onClick={handleToggle}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              settings?.enabled
                ? "bg-[var(--badge-success-text)]"
                : "bg-[var(--text-subtle)]"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                settings?.enabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || port === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
          style={cardStyle}
        >
          {isApplying ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          設定をファイルに書き込む
        </button>
        <button
          type="button"
          onClick={() => setShowCommands((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
          style={cardStyle}
        >
          手動設定コマンド
          {showCommands ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showCommands && (
        <div className="mt-2 rounded-lg bg-[var(--bg-code,var(--bg-app))] p-3">
          <pre className="overflow-x-auto text-xs text-[var(--text-secondary)]">
            {commands}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <ClipboardCopy size={12} />
            コピー
          </button>
        </div>
      )}
    </div>
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
  const theme = useAtomValue(themeAtom);
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

      {/* テレメトリ設定セクション */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <BarChart2 size={14} />
            テレメトリ設定
          </h2>
          {port > 0 && (
            <span className="rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-xs text-[var(--text-primary)]">
              受信ポート: {port}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToolSettingCard tool="claude-code" port={port} />
          <ToolSettingCard tool="codex" port={port} />
        </div>
      </section>

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
