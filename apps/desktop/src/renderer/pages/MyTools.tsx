import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowRight,
  Server,
  Plus,
  Play,
  Square,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { ToggleSwitch } from "../_components/ToggleSwitch";
import { useMcpServers } from "../hooks/useMcpServers";
import type { McpServerWithRuntime } from "../hooks/useMcpServers";
import { cardStyle } from "../utils/theme-styles";
/** MCPサーバーステータス表示 */
const STATUS_CONFIG: Record<
  McpServerWithRuntime["serverStatus"],
  { dotClass: string; label: string }
> = {
  RUNNING: { dotClass: "bg-emerald-400", label: "稼働中" },
  STOPPED: { dotClass: "bg-gray-400", label: "停止中" },
  ERROR: { dotClass: "bg-red-400", label: "エラー" },
  PENDING: { dotClass: "bg-amber-400", label: "接続中" },
};

/**
 * Desktop 起動後、MCP が正常起動すると userData に書き出される（ファイルが無いときは MCP 未起動の可能性）。
 * 本番 macOS の例: ~/Library/Application Support/Tumiki/
 * 開発 (pnpm dev) の例: ~/Library/Application Support/@tumiki/desktop/ （環境で異なる）
 * 正確なパスはメインプロセスログ「Dev: mcp-bridge.json は…」または「Wrote mcp-bridge.json」を参照。
 */
/** tumiki-mcp-bridge は引数なしで既定 userData を自動検索 */
const tumikiBridgeArgs = (): string => `["tumiki-mcp-bridge"]`;

/** AIクライアント接続情報（カード下部に表示） */
const AI_CLIENTS = [
  {
    name: "Claude Code",
    path: (slug: string) =>
      `claude mcp add ${slug} -- npx tumiki-mcp-bridge`,
  },
  {
    name: "Cursor",
    path: (slug: string) =>
      `{ "mcpServers": { "${slug}": { "command": "npx", "args": ${tumikiBridgeArgs()} } } }`,
  },
  {
    name: "Claude Desktop",
    path: (slug: string) =>
      `{ "mcpServers": { "${slug}": { "command": "npx", "args": ${tumikiBridgeArgs()} } } }`,
  },
];

export const MyTools = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const { servers, loading, operating, startAll, stopAll, toggleServer } =
    useMcpServers();

  const lowerQuery = query.toLowerCase();
  const filteredServers = servers.filter(
    (s) =>
      query === "" ||
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.includes(query),
  );

  const hasRunningServers = servers.some(
    (s) => s.serverStatus === "RUNNING" || s.serverStatus === "PENDING",
  );

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            コネクト
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            登録済みのMCPサーバーを管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 起動/停止ボタン */}
          {servers.length > 0 && (
            <button
              type="button"
              disabled={operating}
              onClick={() => void (hasRunningServers ? stopAll() : startAll())}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
                hasRunningServers
                  ? "bg-red-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {hasRunningServers ? (
                <>
                  <Square size={10} />
                  全停止
                </>
              ) : (
                <>
                  <Play size={10} />
                  全起動
                </>
              )}
            </button>
          )}
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 rounded-lg bg-[var(--btn-primary-bg)] px-3 py-1.5 text-xs font-medium text-[var(--btn-primary-text)] transition-opacity hover:opacity-90"
          >
            <Plus size={12} />
            追加
          </Link>
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-opacity hover:opacity-80"
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
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            type="text"
            placeholder="サーバーを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pr-3 pl-9 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>
      </div>

      {/* MCPサーバー一覧 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--text-subtle)]">
          読み込み中...
        </div>
      ) : filteredServers.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-b-[var(--border)] pb-2">
            <h2 className="text-sm font-medium text-[var(--text-muted)]">
              MCPサーバー
            </h2>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {filteredServers.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onToggle={(isEnabled) =>
                  void toggleServer(server.id, isEnabled)
                }
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center text-[var(--text-subtle)]">
          <Server size={32} />
          <p className="mt-3 text-sm">MCPサーバーがまだ登録されていません</p>
          <Link
            to="/tools/catalog"
            className="mt-4 flex items-center gap-1 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-xs font-medium text-[var(--btn-primary-text)] transition hover:opacity-90"
          >
            <Plus size={14} />
            カタログから追加
          </Link>
        </div>
      )}
    </div>
  );
};

/** コピーボタン */
const CopyButton = ({ text }: { text: string }): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded p-0.5 text-[var(--text-subtle)] transition hover:text-[var(--text-muted)]"
      title="コピー"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
};

/** サーバーカードコンポーネント */
const ServerCard = ({
  server,
  onToggle,
}: {
  server: McpServerWithRuntime;
  onToggle: (isEnabled: boolean) => void;
}): JSX.Element => {
  const status = STATUS_CONFIG[server.serverStatus];
  const [showConnections, setShowConnections] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl transition-all ${
        server.isEnabled ? "" : "opacity-50"
      }`}
      style={cardStyle}
    >
      {/* カード上部（クリックで詳細へ遷移） */}
      <Link
        to={`/tools/${String(server.id)}`}
        className="flex flex-col p-4 transition-all hover:-translate-y-0.5"
      >
        {/* アイコン + ステータスドット */}
        <div className="mb-3 flex items-start justify-between">
          {server.connections[0]?.catalog?.iconPath ? (
            <img
              src={server.connections[0].catalog.iconPath}
              alt={server.name}
              className="h-8 w-8 rounded-lg"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-card-hover)]">
              <Server size={18} className="text-[var(--text-muted)]" />
            </div>
          )}
          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
        </div>

        {/* サーバー名 */}
        <div className="mb-1 text-sm font-medium text-[var(--text-primary)]">
          {server.name}
        </div>

        {/* 説明 */}
        <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-subtle)]">
          {server.description || server.slug}
        </div>

        {/* ツール数 + ステータス */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-[var(--text-subtle)]">
            {server.toolCount > 0
              ? `${server.toolCount} tools`
              : `${server.connections.length} 接続`}
          </span>
          <span className="rounded bg-[var(--bg-card-hover)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-muted)]">
            {status.label}
          </span>
        </div>
      </Link>

      {/* フッター: トグル + 接続コマンド */}
      <div className="border-t border-t-[var(--border-subtle)] px-4 py-3">
        {/* トグルスイッチ + 接続コマンド開閉 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowConnections(!showConnections);
            }}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            接続コマンド
            <ChevronDown
              size={10}
              className={`transition-transform ${showConnections ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-subtle)]">
              {server.isEnabled ? "有効" : "無効"}
            </span>
            <ToggleSwitch checked={server.isEnabled} onChange={onToggle} />
          </div>
        </div>

        {/* 接続コマンド一覧（トグルで表示） */}
        {showConnections && (
          <div className="mt-2 space-y-1.5">
            {AI_CLIENTS.map((ai) => (
              <div key={ai.name} className="text-[9px]">
                <span className="mb-0.5 block text-[var(--text-subtle)]">
                  {ai.name}
                </span>
                <div className="flex items-center gap-1">
                  <code className="flex-1 rounded bg-[var(--bg-input)] px-1.5 py-1 font-mono break-all text-[var(--text-secondary)]">
                    {ai.path(server.slug)}
                  </code>
                  <CopyButton text={ai.path(server.slug)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
