import type { JSX } from "react";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Loader2,
} from "lucide-react";
import { toast } from "../../_components/Toast";
import { useAiCodingToolSettings } from "../../hooks/useAiCodingTelemetry";
import { cardStyle } from "../../utils/theme-styles";
import type { AiCodingTool } from "../../../main/types";

const TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};

/** ツール別テレメトリ設定カード（AiIntegrations ページ専用） */
export const ToolSettingCard = ({
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <div
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
            </div>
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
