import type { JSX } from "react";
import { useLocation, Link } from "react-router-dom";
import type { AuditLogItem } from "../../main/types";
import { statusBadge } from "../utils/theme-styles";
import { ClientLogo } from "../_components/ClientLogo";

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
    <p className="text-xs text-gray-500 dark:text-zinc-500">{label}</p>
    <p
      className={`mt-1 text-sm text-gray-600 dark:text-zinc-400 ${mono ? "font-mono" : ""}`}
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
  const item = (location.state as { auditLog?: AuditLogItem } | null)?.auditLog;

  if (!item) {
    return (
      <div className="p-6">
        <Link
          to="/history"
          className="text-sm text-gray-600 hover:opacity-80 dark:text-zinc-400"
        >
          ← 操作履歴
        </Link>
        <p className="mt-8 text-center text-gray-500 dark:text-zinc-500">
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
        className="inline-block text-sm text-gray-600 hover:opacity-80 dark:text-zinc-400"
      >
        ← 操作履歴
      </Link>

      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          操作詳細
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {/* 操作情報カード */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <div className="grid grid-cols-2 gap-6">
          <InfoField label="日時" value={formatDateTime(item.createdAt)} />
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              AIクライアント
            </p>
            <div className="mt-1 flex items-center gap-2">
              <ClientLogo clientName={item.clientName} size="md" />
              <span className="text-sm text-gray-600 dark:text-zinc-400">
                {item.clientName
                  ? item.clientVersion
                    ? `${item.clientName} v${item.clientVersion}`
                    : item.clientName
                  : "-"}
              </span>
            </div>
          </div>
          <InfoField label="接続先" value={item.connectionName ?? "不明"} />
          <InfoField label="ツール" value={item.toolName} />
          <InfoField label="メソッド" value={item.method} mono />
          <InfoField label="レイテンシ" value={`${item.durationMs}ms`} />
          <InfoField label="接続方式" value={item.transportType} mono />
        </div>
      </div>

      {/* エラー詳細カード（エラー時のみ） */}
      {!item.isSuccess && item.errorSummary && (
        <div className="rounded-xl border border-red-500/10 bg-white p-6 dark:border-red-400/10 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
            エラー詳細
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">概要</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {item.errorSummary}
              </p>
            </div>
            {item.errorCode !== null && (
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  エラーコード
                </p>
                <p className="mt-1 font-mono text-sm text-gray-600 dark:text-zinc-400">
                  {item.errorCode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 備考 */}
      <div className="rounded-lg bg-black/[.02] px-4 py-3 dark:bg-white/[.04]">
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          セキュリティポリシーにより、リクエスト/レスポンスのペイロードは表示されません。詳細なログは管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
};
