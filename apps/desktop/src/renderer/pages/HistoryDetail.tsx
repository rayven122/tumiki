import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { HISTORY, type HistoryStatus } from "../data/mock";

/** ステータスバッジの表示 */
const statusBadge = (
  status: HistoryStatus,
): { label: string; className: string } => {
  switch (status) {
    case "success":
      return {
        label: "✅ 成功",
        className: "bg-emerald-400/10 text-emerald-400",
      };
    case "timeout":
      return {
        label: "⚠️ タイムアウト",
        className: "bg-amber-400/10 text-amber-400",
      };
    case "blocked":
      return {
        label: "🔴 権限不足",
        className: "bg-red-400/10 text-red-400",
      };
    case "error":
      return {
        label: "🔴 エラー",
        className: "bg-red-400/10 text-red-400",
      };
  }
};

export const HistoryDetail = (): JSX.Element => {
  const { historyId } = useParams<{ historyId: string }>();
  const item = HISTORY.find((h) => h.id === historyId);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <Link to="/history" className="text-sm text-zinc-400 hover:text-white">
          ← 操作履歴
        </Link>
        <p className="mt-8 text-center text-zinc-500">
          該当する履歴が見つかりません
        </p>
      </div>
    );
  }

  const badge = statusBadge(item.status);
  const isErrorState = item.status === "blocked" || item.status === "error";

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* 戻るリンク */}
      <Link
        to="/history"
        className="mb-6 inline-block text-sm text-zinc-400 hover:text-white"
      >
        ← 操作履歴
      </Link>

      {/* ヘッダー */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">操作詳細</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {/* 操作情報カード */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
        {/* 日時・ツール */}
        <div className="mb-4 grid grid-cols-2 gap-6 border-b border-white/[0.06] pb-4">
          <div>
            <p className="text-xs text-zinc-500">日時</p>
            <p className="mt-1 text-sm text-zinc-300">{item.datetime}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">ツール</p>
            <p className="mt-1 text-sm text-zinc-300">{item.tool}</p>
          </div>
        </div>

        {/* 操作・ステータス */}
        <div className="mb-4 grid grid-cols-2 gap-6 border-b border-white/[0.06] pb-4">
          <div>
            <p className="text-xs text-zinc-500">操作</p>
            <p className="mt-1 font-mono text-sm text-zinc-300">
              {item.operation}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">ステータス</p>
            <p className="mt-1 text-sm text-zinc-300">{item.detail}</p>
          </div>
        </div>

        {/* レイテンシ・リクエストID */}
        <div className="mb-4 grid grid-cols-2 gap-6 border-b border-white/[0.06] pb-4">
          <div>
            <p className="text-xs text-zinc-500">レイテンシ</p>
            <p className="mt-1 text-sm text-zinc-300">{item.latency}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">リクエストID</p>
            <p className="mt-1 font-mono text-sm text-zinc-300">
              {item.requestId}
            </p>
          </div>
        </div>

        {/* エラー詳細セクション（blocked/errorの場合のみ） */}
        {isErrorState && item.errorReason && (
          <div className="mb-4 border-b border-white/[0.06] pb-4">
            <h2 className="mb-3 text-sm font-semibold text-white">
              エラー詳細
            </h2>
            <div className="mb-3">
              <p className="text-xs text-zinc-500">理由</p>
              <p className="mt-1 text-sm text-red-400">{item.errorReason}</p>
            </div>
            {item.requiredRole && (
              <div>
                <p className="text-xs text-zinc-500">必要なロール</p>
                <p className="mt-1 text-sm text-zinc-300">
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
        <div className="rounded-lg bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-zinc-500">
            セキュリティポリシーにより、リクエスト/レスポンスのペイロードは表示されません。詳細なログは管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
};
