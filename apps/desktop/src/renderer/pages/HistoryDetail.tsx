import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { HISTORY } from "../data/mock";
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

export const HistoryDetail = (): JSX.Element => {
  const { historyId } = useParams<{ historyId: string }>();
  const item = HISTORY.find((h) => h.id === historyId);

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
          該当する履歴が見つかりません
        </p>
      </div>
    );
  }

  const badge = statusBadge(item.status);
  const isErrorState = item.status === "blocked" || item.status === "error";

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
        {/* 2カラムグリッドで情報を配置 */}
        <div className="grid grid-cols-2 gap-6">
          <InfoField label="日時" value={item.datetime} />
          <InfoField label="ツール" value={item.tool} />
          <InfoField label="操作" value={item.operation} mono />
          <InfoField label="ステータス" value={item.detail} />
          <InfoField label="レイテンシ" value={item.latency} />
          <InfoField label="リクエストID" value={item.requestId} mono />
        </div>
      </div>

      {/* エラー詳細カード（blocked/errorの場合のみ） */}
      {isErrorState && item.errorReason && (
        <div className="rounded-xl border border-[var(--badge-error-bg)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-semibold text-[var(--badge-error-text)]">
            エラー詳細
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)]">理由</p>
              <p className="mt-1 text-sm text-[var(--badge-error-text)]">
                {item.errorReason}
              </p>
            </div>
            {item.requiredRole && (
              <div>
                <p className="text-xs text-[var(--text-muted)]">必要なロール</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {item.requiredRole}
                </p>
              </div>
            )}
          </div>

          {/* 権限申請ボタン（blocked時のみ） */}
          {item.status === "blocked" && (
            <div className="mt-4">
              <Link
                to="/requests/new"
                className="inline-block rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
              >
                この操作の権限を申請する
              </Link>
            </div>
          )}
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
