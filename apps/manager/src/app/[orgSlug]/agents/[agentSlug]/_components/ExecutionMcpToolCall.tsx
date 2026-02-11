"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { TypingIndicator } from "@/components/typing-indicator";
import { parseToolName } from "@/utils/mcpToolName";
import { detectErrorFromOutput } from "@/utils/mcpToolError";

// AI SDK 6 のツール状態
type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

type ExecutionMcpToolCallProps = {
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
};

/**
 * 状態に応じたアイコン
 */
const StateIcon = ({ state }: { state: ToolState }) => {
  switch (state) {
    case "input-streaming":
    case "input-available":
      return <TypingIndicator size="sm" className="text-muted-foreground" />;
    case "output-available":
      return <span className="text-green-600">✓</span>;
    case "output-error":
      return <span className="text-red-600">✗</span>;
  }
};

/**
 * JSON表示（折りたたみ対応）
 */
const JsonPreview = ({
  data,
  label,
  defaultExpanded = false,
}: {
  data: unknown;
  label: string;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const jsonString = JSON.stringify(data, null, 2);
  const lineCount = jsonString.split("\n").length;
  const isLong = lineCount > 5;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
      >
        {expanded ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronRightIcon className="size-3" />
        )}
        {label}
        {!expanded && isLong && (
          <span className="text-muted-foreground/60">({lineCount} lines)</span>
        )}
      </button>
      {expanded && (
        <pre className="bg-muted/50 mt-1 max-h-60 overflow-auto rounded p-2 text-xs break-words whitespace-pre-wrap">
          {jsonString}
        </pre>
      )}
    </div>
  );
};

/**
 * 実行結果モーダル用MCPツール呼び出し表示コンポーネント
 * チャット画面のMcpToolCallの簡易版（再認証機能なし）
 */
export const ExecutionMcpToolCall = ({
  toolName,
  state,
  input,
  output,
}: ExecutionMcpToolCallProps) => {
  const { serverSlug, displayToolName } = parseToolName(toolName);
  const isLoading = state === "input-streaming" || state === "input-available";

  // outputにisError:trueがあればエラーとして扱う
  const outputHasError = detectErrorFromOutput(output);

  // 実際に表示する状態
  const displayState: ToolState =
    state === "output-available" && outputHasError ? "output-error" : state;

  return (
    <div
      className={cn(
        "border-border bg-muted/30 my-2 min-w-0 overflow-hidden rounded-lg border p-3",
        isLoading && "animate-pulse",
      )}
    >
      {/* ヘッダー: サーバーslug > ツール名 */}
      <div className="flex items-center gap-2">
        <StateIcon state={displayState} />
        {serverSlug && (
          <>
            <span className="text-muted-foreground text-sm font-medium">
              {serverSlug}
            </span>
            <span className="text-muted-foreground/50">&gt;</span>
          </>
        )}
        <span className="text-foreground text-sm font-semibold">
          {displayToolName}
        </span>
      </div>

      {/* パラメータ（入力） */}
      {input !== undefined && input !== null && (
        <JsonPreview data={input} label="パラメータ" defaultExpanded={true} />
      )}

      {/* 結果（出力） */}
      {displayState === "output-available" &&
        output !== undefined &&
        output !== null && (
          <JsonPreview data={output} label="結果" defaultExpanded={false} />
        )}

      {/* エラー */}
      {displayState === "output-error" && output !== undefined && (
        <div>
          {typeof output === "object" ? (
            <JsonPreview data={output} label="エラー" defaultExpanded={true} />
          ) : (
            <div className="mt-2 text-sm text-red-600">
              エラー: {typeof output === "string" ? output : "不明なエラー"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
