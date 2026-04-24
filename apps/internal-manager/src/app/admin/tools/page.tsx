"use client";

import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import {
  TOOLS,
  type ToolStatus,
  type ToolProtocol,
} from "../_components/mock-data";

const STATUS_DOT: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

const STATUS_LABEL: Record<ToolStatus, string> = {
  active: "稼働中",
  degraded: "不安定",
  down: "停止中",
};

export default function AdminToolsPage() {
  const [statusFilter, setStatusFilter] = useState<ToolStatus | "all">("all");
  const [protocolFilter, setProtocolFilter] = useState<ToolProtocol | "all">(
    "all",
  );

  const filtered = TOOLS.filter(
    (t) =>
      (statusFilter === "all" || t.status === statusFilter) &&
      (protocolFilter === "all" || t.protocol === protocolFilter),
  );

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            ツール管理
          </h1>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            全{TOOLS.length}件のコネクタ
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          <Plus size={13} />
          ツール追加
        </button>
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ToolStatus | "all")
          }
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="all">すべてのステータス</option>
          <option value="active">稼働中</option>
          <option value="degraded">不安定</option>
          <option value="down">停止中</option>
        </select>
        <select
          value={protocolFilter}
          onChange={(e) =>
            setProtocolFilter(e.target.value as ToolProtocol | "all")
          }
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="all">すべてのプロトコル</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
          <option value="stdio">stdio</option>
        </select>
        <span
          className="ml-auto text-xs"
          style={{ color: "var(--text-subtle)" }}
        >
          {filtered.length} 件表示
        </span>
      </div>

      {/* ツールカードグリッド */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((tool) => (
          <div
            key={tool.id}
            className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--bg-card)",
              border: tool.approved
                ? "1px solid rgba(52,211,153,0.2)"
                : "1px solid var(--border)",
            }}
          >
            {/* ロゴ + ステータス */}
            <div className="mb-3 flex items-start justify-between">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: tool.color }}
              >
                {tool.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_DOT[tool.status]}`}
                />
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {STATUS_LABEL[tool.status]}
                </span>
              </div>
            </div>

            {/* ツール名 */}
            <div
              className="mb-1 text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.name}
            </div>

            {/* 説明 */}
            <div
              className="mb-3 text-[10px] leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {tool.description}
            </div>

            {/* 操作数 + プロトコル */}
            <div className="mb-3 flex items-center justify-between">
              <span
                className="font-mono text-[9px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {tool.allowedCount} / {tool.operationCount} ops
              </span>
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[8px]"
                style={{
                  backgroundColor: "var(--bg-active)",
                  color: "var(--text-muted)",
                }}
              >
                {tool.protocol}
              </span>
            </div>

            {/* アクション */}
            <button
              type="button"
              className="w-full rounded-lg px-3 py-1.5 text-[10px] font-medium transition-opacity hover:opacity-80"
              style={
                tool.approved
                  ? {
                      backgroundColor: "var(--bg-active)",
                      color: "var(--text-secondary)",
                    }
                  : {
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-text)",
                    }
              }
            >
              {tool.approved ? (
                <span className="flex items-center justify-center gap-1">
                  <Settings size={10} />
                  設定
                </span>
              ) : (
                "有効化"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
