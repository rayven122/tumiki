import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { HISTORY, type HistoryStatus } from "../data/mock";

/** ステータスバッジの表示 */
const statusBadge = (
  status: HistoryStatus,
): { label: string; style: React.CSSProperties } => {
  switch (status) {
    case "success":
      return {
        label: "成功",
        style: {
          backgroundColor: "var(--badge-success-bg)",
          color: "var(--badge-success-text)",
        },
      };
    case "timeout":
      return {
        label: "タイムアウト",
        style: {
          backgroundColor: "var(--badge-warn-bg)",
          color: "var(--badge-warn-text)",
        },
      };
    case "blocked":
      return {
        label: "権限不足",
        style: {
          backgroundColor: "var(--badge-error-bg)",
          color: "var(--badge-error-text)",
        },
      };
    case "error":
      return {
        label: "エラー",
        style: {
          backgroundColor: "var(--badge-error-bg)",
          color: "var(--badge-error-text)",
        },
      };
  }
};

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
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
    <p
      className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}
      style={{ color: "var(--text-secondary)" }}
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
          className="text-sm hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          ← 操作履歴
        </Link>
        <p className="mt-8 text-center" style={{ color: "var(--text-muted)" }}>
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
        className="inline-block text-sm hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
      >
        ← 操作履歴
      </Link>

      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          操作詳細
        </h1>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
          style={badge.style}
        >
          {badge.label}
        </span>
      </div>

      {/* 操作情報カード */}
      <div
        className="rounded-xl p-6"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
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
        <div
          className="rounded-xl p-6"
          style={{
            border: "1px solid var(--badge-error-bg)",
            backgroundColor: "var(--bg-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--badge-error-text)" }}
          >
            エラー詳細
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                理由
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--badge-error-text)" }}
              >
                {item.errorReason}
              </p>
            </div>
            {item.requiredRole && (
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  必要なロール
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
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
                className="inline-block rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-text)",
                }}
              >
                この操作の権限を申請する
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 備考 */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ backgroundColor: "var(--bg-card-hover)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          セキュリティポリシーにより、リクエスト/レスポンスのペイロードは表示されません。詳細なログは管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
};
