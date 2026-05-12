import type { JSX } from "react";
import { ArrowRight, Activity, CheckCircle2 } from "lucide-react";
import { cardStyle } from "../../utils/theme-styles";
import type { AiCodingTool, GetToolSettingsResult } from "../../../main/types";

const TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};

const TOOL_LOGOS: Record<AiCodingTool, string> = {
  "claude-code": "/logos/ai-clients/claude.webp",
  codex: "/logos/ai-clients/codex-cli.svg",
};

/** ツール別使用量記録カード — クリックでモーダルを開く */
export const ToolSettingCard = ({
  tool,
  settings,
  onClick,
}: {
  tool: AiCodingTool;
  settings: GetToolSettingsResult | null;
  onClick: () => void;
}): JSX.Element => {
  const isApplied = Boolean(settings?.appliedAt);
  const isEnabled = settings?.enabled ?? false;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={cardStyle}
    >
      <div className="flex w-full items-center justify-between">
        <img
          src={TOOL_LOGOS[tool]}
          alt={TOOL_LABELS[tool]}
          className="h-10 w-10 rounded-lg"
        />
        <ArrowRight size={14} className="text-[var(--text-subtle)]" />
      </div>
      <div className="w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {TOOL_LABELS[tool]}
          </span>
          {isEnabled && (
            <span className="flex items-center gap-0.5 rounded-full bg-[var(--badge-success-bg,#dcfce7)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--badge-success-text,#16a34a)]">
              <Activity size={8} />
              記録中
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
          {isApplied ? (
            <span className="flex items-center gap-1 text-[var(--badge-success-text,#16a34a)]">
              <CheckCircle2 size={10} />
              連携済み{" "}
              {new Date(settings?.appliedAt ?? "").toLocaleDateString("ja-JP")}
            </span>
          ) : (
            "未連携"
          )}
        </div>
      </div>
    </button>
  );
};
