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
        label: "✅ 成功",
        style: {
          backgroundColor: "var(--badge-success-bg)",
          color: "var(--badge-success-text)",
        },
      };
    case "timeout":
      return {
        label: "⚠️ タイムアウト",
        style: {
          backgroundColor: "var(--badge-warn-bg)",
          color: "var(--badge-warn-text)",
        },
      };
    case "blocked":
      return {
        label: "🔴 権限不足",
        style: {
          backgroundColor: "var(--badge-error-bg)",
          color: "var(--badge-error-text)",
        },
      };
    case "error":
      return {
        label: "🔴 エラー",
        style: {
          backgroundColor: "var(--badge-error-bg)",
          color: "var(--badge-error-text)",
        },
      };
  }
};

export const HistoryDetail = (): JSX.Element => {
  const { historyId } = useParams<{ historyId: string }>();
  const item = HISTORY.find((h) => h.id === historyId);

  if (!item) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
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
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 戻るリンク */}
      <Link
        to="/history"
        className="mb-6 inline-block text-sm hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
      >
        ← 操作履歴
      </Link>

      {/* ヘッダー */}
      <div className="mb-6 flex items-center gap-3">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          操作詳細
        </h1>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={badge.style}
        >
          {badge.label}
        </span>
      </div>

      {/* 操作情報カード */}
      <div
        className="rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* 日時・ツール */}
        <div
          className="mb-4 grid grid-cols-2 gap-6 pb-4"
          style={{
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border)",
          }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              日時
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.datetime}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              ツール
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.tool}
            </p>
          </div>
        </div>

        {/* 操作・ステータス */}
        <div
          className="mb-4 grid grid-cols-2 gap-6 pb-4"
          style={{
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border)",
          }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              操作
            </p>
            <p
              className="mt-1 font-mono text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.operation}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              ステータス
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.detail}
            </p>
          </div>
        </div>

        {/* レイテンシ・リクエストID */}
        <div
          className="mb-4 grid grid-cols-2 gap-6 pb-4"
          style={{
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border)",
          }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              レイテンシ
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.latency}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              リクエストID
            </p>
            <p
              className="mt-1 font-mono text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.requestId}
            </p>
          </div>
        </div>

        {/* エラー詳細セクション（blocked/errorの場合のみ） */}
        {isErrorState && item.errorReason && (
          <div
            className="mb-4 pb-4"
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--border)",
            }}
          >
            <h2
              className="mb-3 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              エラー詳細
            </h2>
            <div className="mb-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                理由
              </p>
              <p className="mt-1 text-sm text-red-400">{item.errorReason}</p>
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
        )}

        {/* 権限申請ボタン（blocked時のみ） */}
        {item.status === "blocked" && (
          <div className="mb-4">
            <Link
              to="/requests/new"
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              この操作の権限を申請する
            </Link>
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
    </div>
  );
};
