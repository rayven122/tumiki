import type { JSX } from "react";
import { useLocation, Link } from "react-router-dom";
import type { AuditLogItem } from "../../main/types";
import { statusBadge } from "../utils/theme-styles";

/** 情報フィールドの表示 */
const InfoField = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element => (
  <div>
    <p className="text-xs text-[var(--text-muted)]">{label}</p>
    <p
      className={`mt-1 text-sm text-[var(--text-secondary)] ${mono ? "font-mono" : ""}`}
    >
      {value}
    </p>
  </div>
);

/** ISO文字列 → MM/DD HH:mm:ss */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleTimeString("ja-JP", { hour12: false });
  return `${month}/${day} ${time}`;
};

export const HistoryDetail = (): JSX.Element => {
  const location = useLocation();
  const item = (location.state as { auditLog?: AuditLogItem } | null)
    ?.auditLog;

  if (!item) {
    return (
      <div className="p-6">
        <Link
          to="/history"
          className="text-sm text-[var(--text-secondary)] hover:opacity-80"
        >
          ← 操作履歴
        </Link>
        <p className="mt-8 text-center text-[var(--text-muted)]">
          該当する履歴が見つかりません。操作履歴から選択してください。
        </p>
      </div>
    );
  }

  const status = item.isSuccess ? "success" : "error";
  const badge = statusBadge(status);

  return (
    <div className="space-y-4 p-6">
      {/* 戻るリンク */}
      <Link
        to="/history"
        className="inline-block text-sm text-[var(--text-secondary)] hover:opacity-80"
      >
        ← 操作履歴
      </Link>

      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          操作詳細
        </h1>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>
      </div>

      {/* 操作情報カード */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-2 gap-6">
          <InfoField label="日時" value={formatDateTime(item.createdAt)} />
          <InfoField
            label="接続先"
            value={item.connectionName ?? "不明"}
          />
          <InfoField label="ツール" value={item.toolName} />
          <InfoField label="メソッド" value={item.method} mono />
          <InfoField label="レイテンシ" value={`${item.durationMs}ms`} />
          <InfoField label="接続方式" value={item.transportType} mono />
        </div>
      </div>

      {/* エラー詳細カード（エラー時のみ） */}
      {!item.isSuccess && item.errorSummary && (
        <div className="rounded-xl border border-[var(--badge-error-bg)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--badge-error-text)]">
            エラー詳細
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)]">概要</p>
              <p className="mt-1 text-sm text-[var(--badge-error-text)]">
                {item.errorSummary}
              </p>
            </div>
            {item.errorCode !== null && (
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  エラーコード
                </p>
                <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">
                  {item.errorCode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 備考 */}
      <div className="rounded-lg bg-[var(--bg-card-hover)] px-4 py-3">
        <p className="text-xs text-[var(--text-muted)]">
          セキュリティポリシーにより、リクエスト/レスポンスのペイロードは表示されません。詳細なログは管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
};
