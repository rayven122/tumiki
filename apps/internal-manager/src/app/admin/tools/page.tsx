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

const AdminToolsPage = () => {
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
          <h1 className="text-text-primary text-lg font-semibold">
            ツール管理
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            全{TOOLS.length}件のコネクタ
          </p>
        </div>
        <button
          type="button"
          className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
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
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
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
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのプロトコル</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
          <option value="stdio">stdio</option>
        </select>
        <span className="text-text-subtle ml-auto text-xs">
          {filtered.length} 件表示
        </span>
      </div>

      {/* ツールカードグリッド */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((tool) => (
          <div
            key={tool.id}
            className={`bg-bg-card rounded-xl p-4 transition-all hover:-translate-y-0.5 ${tool.approved ? "border border-[rgba(52,211,153,0.2)]" : "border-border-default border"}`}
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
                <span className="text-text-subtle text-[10px]">
                  {STATUS_LABEL[tool.status]}
                </span>
              </div>
            </div>

            {/* ツール名 */}
            <div className="text-text-primary mb-1 text-sm font-medium">
              {tool.name}
            </div>

            {/* 説明 */}
            <div className="text-text-muted mb-3 text-[10px] leading-relaxed">
              {tool.description}
            </div>

            {/* 操作数 + プロトコル */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-text-subtle font-mono text-[9px]">
                {tool.allowedCount} / {tool.operationCount} ops
              </span>
              <span className="bg-bg-active text-text-muted rounded px-1.5 py-0.5 font-mono text-[8px]">
                {tool.protocol}
              </span>
            </div>

            {/* アクション */}
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-1.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${tool.approved ? "bg-bg-active text-text-secondary" : "bg-btn-primary-bg text-btn-primary-text"}`}
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
};

export default AdminToolsPage;
