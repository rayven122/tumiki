import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Server, Plus, Trash2 } from "lucide-react";
import { ToggleSwitch } from "../_components/ToggleSwitch";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { useMcpServers } from "../hooks/useMcpServers";
import type { McpServerWithRuntime } from "../hooks/useMcpServers";
import { cardStyle } from "../utils/theme-styles";

/** MCPサーバーステータス表示（CLIモードがDB上のserverStatusを更新する） */
const STATUS_CONFIG: Record<
  McpServerWithRuntime["serverStatus"],
  { badgeClass: string; label: string }
> = {
  RUNNING: {
    badgeClass: "bg-emerald-400/10 text-emerald-300",
    label: "稼働中",
  },
  STOPPED: {
    badgeClass: "bg-gray-400/10 text-gray-400",
    label: "停止中",
  },
  ERROR: {
    badgeClass: "bg-red-400/10 text-red-300",
    label: "エラー",
  },
  PENDING: {
    badgeClass: "bg-amber-400/10 text-amber-300",
    label: "接続中",
  },
};

export const MyTools = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const { servers, loading, toggleServer, deleteServer } = useMcpServers();

  const lowerQuery = query.toLowerCase();
  const filteredServers = servers.filter(
    (s) =>
      query === "" ||
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery),
  );

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            コネクト
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            登録済みのMCPサーバーを管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
          >
            <Plus size={12} />
            追加
          </Link>
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 text-xs text-gray-500 transition-opacity hover:opacity-80 dark:text-zinc-500"
          >
            カタログ
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* 検索バー */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-zinc-600"
          />
          <input
            type="text"
            placeholder="サーバーを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-900 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-white"
          />
        </div>
      </div>

      {/* MCPサーバー一覧 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-600">
          読み込み中...
        </div>
      ) : filteredServers.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-b-gray-200 pb-2 dark:border-b-white/[.08]">
            <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500">
              MCPサーバー
            </h2>
            <span className="text-[10px] text-gray-400 dark:text-zinc-600">
              {filteredServers.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onToggle={(isEnabled) =>
                  void toggleServer(server.id, isEnabled)
                }
                onDelete={() => void deleteServer(server.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center text-gray-400 dark:text-zinc-600">
          <Server size={32} />
          <p className="mt-3 text-sm">MCPサーバーがまだ登録されていません</p>
          <Link
            to="/tools/catalog"
            className="mt-4 flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
          >
            <Plus size={14} />
            カタログから追加
          </Link>
        </div>
      )}
    </div>
  );
};

/** サーバーカードコンポーネント */
const ServerCard = ({
  server,
  onToggle,
  onDelete,
}: {
  server: McpServerWithRuntime;
  onToggle: (isEnabled: boolean) => void;
  onDelete: () => void;
}): JSX.Element => {
  const status = STATUS_CONFIG[server.serverStatus] ?? {
    badgeClass: "bg-gray-400/10 text-gray-400",
    label: "停止中",
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl transition-all ${cardStyle} ${
        server.isEnabled ? "" : "opacity-50"
      }`}
    >
      {/* カード上部（クリックで詳細へ遷移） */}
      <Link
        to={`/tools/${String(server.id)}`}
        className="flex flex-col p-4 transition-all hover:-translate-y-0.5"
      >
        {/* アイコン + ステータスバッジ */}
        <div className="mb-3 flex items-start justify-between gap-2">
          {server.connections[0]?.catalog?.iconPath ? (
            <img
              src={server.connections[0].catalog.iconPath}
              alt={server.name}
              className="h-8 w-8 rounded-lg"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[.02] dark:bg-white/[.04]">
              <Server size={18} className="text-gray-500 dark:text-zinc-500" />
            </div>
          )}
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${status.badgeClass}`}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-current"
            />
            {status.label}
          </span>
        </div>

        {/* サーバー名 */}
        <div className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
          {server.name}
        </div>

        {/* 説明 */}
        <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-gray-400 dark:text-zinc-600">
          {server.description || server.slug}
        </div>

        {/* ツール数 */}
        <div className="flex items-center">
          <span className="font-mono text-[9px] text-gray-400 dark:text-zinc-600">
            {`${String(server.toolCount)} tools`}
          </span>
        </div>
      </Link>

      {/* フッター: 削除 + 有効/無効トグル */}
      <div className="flex items-center justify-end gap-2 border-t border-t-gray-100 px-4 py-3 dark:border-t-white/[.03]">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded p-1 text-gray-400 transition hover:text-red-400 dark:text-zinc-600"
          title="削除"
        >
          <Trash2 size={12} />
        </button>
        <span className="text-[10px] text-gray-400 dark:text-zinc-600">
          {server.isEnabled ? "有効" : "無効"}
        </span>
        <ToggleSwitch checked={server.isEnabled} onChange={onToggle} />
      </div>

      {/* 削除確認モーダル */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="サーバーを削除"
        message={`「${server.name}」を削除しますか？この操作は取り消せません。`}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
