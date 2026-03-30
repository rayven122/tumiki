import type { JSX } from "react";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft, ExternalLink, Shield, ChevronDown } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, HISTORY, MCP_BASE_URL, MCP_CLI_COMMAND } from "../data/mock";
import type { ToolStatus } from "../data/mock";
import { statusBadge, cardStyle } from "../utils/theme-styles";

/** ツールステータスバッジの表示定義 */
const toolStatusBadge: Record<
  ToolStatus,
  { bg: string; text: string; label: string }
> = {
  active: {
    bg: "var(--badge-success-bg)",
    text: "var(--badge-success-text)",
    label: "稼働中",
  },
  degraded: {
    bg: "var(--badge-warn-bg)",
    text: "var(--badge-warn-text)",
    label: "応答遅延",
  },
  down: {
    bg: "var(--badge-error-bg)",
    text: "var(--badge-error-text)",
    label: "停止中",
  },
};

/** AIクライアント接続先一覧 */
const AI_CLIENT_CONNECTIONS = [
  {
    name: "Cursor",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/cursor.webp"
        : "/logos/ai-clients/cursor.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Claude Code",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Cline",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/cline.webp"
        : "/logos/ai-clients/cline.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Claude",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/sse`,
    type: "SSE",
  },
  {
    name: "ChatGPT",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/chatgpt.webp"
        : "/logos/ai-clients/chatgpt.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
  {
    name: "Copilot",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/copilot.webp"
        : "/logos/ai-clients/copilot.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
  {
    name: "Antigravity",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/antigravity.webp"
        : "/logos/ai-clients/antigravity.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/sse`,
    type: "SSE",
  },
  {
    name: "API",
    logo: () => "",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
];

export const ToolDetail = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const { toolId } = useParams<{ toolId: string }>();
  const tool = TOOLS.find((t) => t.id === toolId);
  const [showAiClients, setShowAiClients] = useState(false);

  // ツールが見つからない場合
  if (!tool) {
    return (
      <div className="p-6">
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div
          className="mt-12 text-center text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          ツールが見つかりません
        </div>
      </div>
    );
  }

  const badge = toolStatusBadge[tool.status];

  // 該当ツールの操作履歴
  const toolHistory = HISTORY.filter((h) => h.tool === tool.name);

  // 権限が不足している操作があるか
  const hasLockedOperations = tool.operations.some((op) => !op.allowed);

  return (
    <div className="space-y-6 p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        コネクト
      </Link>

      {/* ツール名 + ステータス */}
      <div className="flex items-center gap-3">
        <img
          src={theme === "dark" ? tool.logoDark : tool.logoLight}
          alt={tool.name}
          className="h-12 w-12 rounded-lg"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.name}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tool.description}
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          基本情報
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              接続先
            </span>
            <p
              className="mt-1 flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <ExternalLink size={12} />
              {tool.endpoint}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              プロトコル
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.protocol}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              追加日
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.addedDate}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              管理者
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.admin}
            </p>
          </div>
        </div>

        {/* AIクライアント接続方法（アコーディオン + スクロール） */}
        <div
          className="mt-5"
          style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
        >
          <button
            onClick={() => setShowAiClients(!showAiClients)}
            className="flex w-full items-center justify-between"
          >
            <h3
              className="text-xs font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              AIクライアントから接続
            </h3>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {AI_CLIENT_CONNECTIONS.length}件
              </span>
              <ChevronDown
                size={14}
                className="transition-transform"
                style={{
                  color: "var(--text-subtle)",
                  transform: showAiClients ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </div>
          </button>

          {showAiClients && (
            <div className="mt-3 max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
              {AI_CLIENT_CONNECTIONS.map((ai) => (
                <div
                  key={ai.name}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ backgroundColor: "var(--bg-card-hover)" }}
                >
                  {ai.logo(theme) ? (
                    <img
                      src={ai.logo(theme)}
                      alt={ai.name}
                      className="h-5 w-5 shrink-0 rounded"
                    />
                  ) : (
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold"
                      style={{
                        backgroundColor: "var(--bg-active)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {"<>"}
                    </div>
                  )}
                  <span
                    className="w-24 shrink-0 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {ai.name}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[8px] font-medium"
                    style={{
                      backgroundColor: "var(--bg-active)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {ai.type}
                  </span>
                  <code
                    className="flex-1 truncate rounded px-2 py-1 font-mono text-[10px]"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {ai.path(tool.id)}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* あなたの権限（LP風トグル表示） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="mb-4 flex items-center gap-2">
          <Shield size={14} style={{ color: "var(--text-muted)" }} />
          <h2
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            あなたの権限
          </h2>
        </div>

        {/* LP風のグリッド表示 */}
        <div
          className="overflow-hidden rounded-lg"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
          }}
        >
          {tool.operations.map((op, idx) => (
            <div
              key={op.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                backgroundColor: "var(--bg-card)",
                ...(idx < tool.operations.length - 1
                  ? {
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid" as const,
                      borderBottomColor: "var(--border-subtle)",
                    }
                  : {}),
              }}
            >
              {/* ON/OFF ドット */}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: op.allowed
                    ? "var(--badge-success-text)"
                    : "var(--text-subtle)",
                }}
              />
              {/* 操作名 */}
              <span
                className="w-36 shrink-0 font-mono text-xs"
                style={{
                  color: op.allowed
                    ? "var(--text-secondary)"
                    : "var(--text-subtle)",
                }}
              >
                {op.name}
              </span>
              {/* 説明 */}
              <span
                className="flex-1 text-xs"
                style={{
                  color: op.allowed
                    ? "var(--text-muted)"
                    : "var(--text-subtle)",
                }}
              >
                {op.description}
              </span>
              {/* ステータスラベル */}
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: op.allowed
                    ? "var(--badge-success-bg)"
                    : "var(--bg-active)",
                  color: op.allowed
                    ? "var(--badge-success-text)"
                    : "var(--text-muted)",
                }}
              >
                {op.allowed ? "許可" : "不可"}
              </span>
            </div>
          ))}
        </div>

        {hasLockedOperations && (
          <div className="mt-4">
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              不可の権限を申請する
            </Link>
          </div>
        )}
      </div>

      {/* 利用統計（目立つデザイン） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          利用統計（今月）
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "総リクエスト",
              value: tool.stats.requests.toLocaleString(),
              suffix: "",
            },
            {
              label: "成功率",
              value: tool.stats.successRate.toString(),
              suffix: "%",
            },
            {
              label: "平均応答",
              value: tool.stats.avgLatency.toString(),
              suffix: "ms",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "var(--bg-card-hover)" }}
            >
              <p
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {stat.value}
                <span
                  className="ml-0.5 text-sm font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  {stat.suffix}
                </span>
              </p>
              <p
                className="mt-1 text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近の操作（pillバッジ） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          最近の操作
        </h2>
        {toolHistory.length > 0 ? (
          <div className="space-y-2">
            {toolHistory.map((item) => {
              const pill = statusBadge(item.status);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: "var(--bg-card-hover)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.datetime}
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.operation}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.detail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.latency}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: pill.bg, color: pill.text }}
                    >
                      {pill.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
            操作履歴がありません
          </p>
        )}
      </div>
    </div>
  );
};
