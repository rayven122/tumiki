import type { JSX } from "react";
import { Sparkles, Check, ExternalLink } from "lucide-react";
import { toast } from "../_components/Toast";

const PREMIUM_FEATURES = [
  "チーム内での権限申請・承認ワークフロー",
  "管理者によるロール・アクセス権限管理",
  "チーム全体の操作履歴・監査ログ",
  "組織単位でのツール承認・共有",
  "クラウド同期とバックアップ",
];

const PRICING_URL = "https://rayven.app/pricing";

export const UpgradePlan = (): JSX.Element => {
  const handleUpgrade = (): void => {
    void window.electronAPI.shell.openExternal(PRICING_URL).catch(() => {
      toast.error("外部ブラウザを開けませんでした");
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-active)]">
          <Sparkles className="text-[var(--text-primary)]" size={26} />
        </div>

        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          権限申請は Pro プラン限定機能です
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
          チームでの MCP サーバー共有や承認フローをご利用いただくには、Pro
          プランへのアップグレードが必要です。
        </p>

        <ul className="mt-6 space-y-2 text-left">
          {PREMIUM_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
            >
              <Check
                size={16}
                className="mt-0.5 shrink-0 text-[var(--badge-success-text)]"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleUpgrade}
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[var(--text-primary)] px-5 py-2.5 text-sm font-medium text-[var(--bg-app)] transition-opacity hover:opacity-90"
        >
          プランを見る
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};
