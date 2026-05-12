import type { JSX } from "react";
import { useState } from "react";
import { X, Check, ClipboardCopy, Loader2, Activity } from "lucide-react";
import { toast } from "../../_components/Toast";
import { useAiCodingToolSettings } from "../../hooks/useAiCodingTelemetry";
import { cardStyle } from "../../utils/theme-styles";
import type { AiCodingTool } from "../../../main/types";

const TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};

const TOOL_LOGOS: Record<AiCodingTool, string> = {
  "claude-code": "/logos/ai-clients/claude.webp",
  codex: "/logos/ai-clients/codex-cli.svg",
};

/** 使用量記録設定モーダル */
export const AiCodingTrackingModal = ({
  tool,
  port,
  onClose,
}: {
  tool: AiCodingTool;
  port: number;
  onClose: () => void;
}): JSX.Element => {
  const { settings, isLoading, refresh } = useAiCodingToolSettings(tool);
  const [isApplying, setIsApplying] = useState(false);

  const handleToggle = (): void => {
    const newEnabled = !(settings?.enabled ?? false);
    void window.electronAPI.aiCodingTelemetry
      .saveToolEnabled(tool, newEnabled)
      .then(() => refresh());
  };

  const handleApply = (): void => {
    if (port === 0) {
      toast.error("受信サーバーが起動していません");
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
      .finally(() => setIsApplying(false));
  };

  // 手動設定用のシェルコマンド
  const commands =
    tool === "claude-code"
      ? `export CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`
      : `export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(commands).then(() => {
      toast.success("コマンドをコピーしました");
    });
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        {/* ヘッダー */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={TOOL_LOGOS[tool]}
              alt={TOOL_LABELS[tool]}
              className="h-9 w-9 rounded-lg"
            />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {TOOL_LABELS[tool]}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                使用量の記録設定
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>

        {/* 有効/無効トグル */}
        <div
          className="mb-4 flex items-center justify-between rounded-xl p-4"
          style={cardStyle}
        >
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              使用量の記録
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              トークン数・API呼び出し回数などを収集します
            </p>
          </div>
          {!isLoading && (
            <button
              type="button"
              role="switch"
              aria-checked={settings?.enabled ?? false}
              aria-label={`${TOOL_LABELS[tool]} の使用量記録を有効化`}
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

        {/* 連携済み情報 */}
        {settings?.appliedAt && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--badge-success-bg,#dcfce7)] px-3 py-2 text-xs text-[var(--badge-success-text,#16a34a)]">
            <Activity size={12} />
            <span>
              連携済み:{" "}
              {new Date(settings.appliedAt).toLocaleDateString("ja-JP")}
              {settings.appliedPort !== undefined &&
                ` (port: ${settings.appliedPort})`}
            </span>
          </div>
        )}

        {/* 設定をファイルに書き込む */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
            自動設定
          </p>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || port === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
            style={cardStyle}
          >
            {isApplying ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            設定ファイルに自動書き込み
          </button>
          {port === 0 && (
            <p className="mt-1.5 text-center text-[10px] text-[var(--text-subtle)]">
              アプリを再起動すると受信サーバーが起動します
            </p>
          )}
        </div>

        {/* 手動設定コマンド */}
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
            手動設定（シェル）
          </p>
          <div className="rounded-lg bg-[var(--bg-code,var(--bg-app))] p-3">
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
        </div>
      </div>
    </div>
  );
};
