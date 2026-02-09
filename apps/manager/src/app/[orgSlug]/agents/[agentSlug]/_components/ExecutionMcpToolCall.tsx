"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { useAtomValue } from "jotai";
import { mcpServerMapAtom, resolveServerName } from "@/atoms/mcpServerMapAtom";
import { TypingIndicator } from "@/components/typing-indicator";

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
 * ツール名からMCPサーバーIDと表示用ツール名を抽出
 * 形式: serverId__prefix__toolName または serverId__toolName
 */
const parseToolName = (
  fullToolName: string,
): { serverId: string; displayToolName: string } => {
  const parts = fullToolName.split("__");

  if (parts.length < 2) {
    return { serverId: "", displayToolName: fullToolName };
  }

  const serverId = parts[0] ?? "";
  // 3つ以上: serverId__prefix__toolName -> toolName以降を結合
  // 2つ: serverId__toolName -> toolNameのみ
  const displayToolName =
    parts.length >= 3 ? parts.slice(2).join("__") : (parts[1] ?? "");
  return { serverId, displayToolName };
};

/**
 * 状態に応じたアイコン
 */
const StateIcon = ({ state }: { state: ToolState }) => {
  // 入力待ち/ストリーミング中はタイピングインジケータ
  if (state === "input-streaming" || state === "input-available") {
    return <TypingIndicator size="sm" className="text-muted-foreground" />;
  }
  // 成功時はチェックマーク
  if (state === "output-available") {
    return <span className="text-green-600">✓</span>;
  }
  // エラー時はバツマーク
  return <span className="text-red-600">✗</span>;
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
 * 出力からエラー状態を検出
 */
const detectErrorFromOutput = (output: unknown): boolean => {
  if (output && typeof output === "object") {
    const outputObj = output as { isError?: boolean };
    if (outputObj.isError === true) return true;
  }

  if (typeof output === "string") {
    const lowerOutput = output.toLowerCase();
    if (
      lowerOutput.includes("failed to execute") ||
      lowerOutput.includes("failed to connect") ||
      lowerOutput.includes("mcp error") ||
      lowerOutput.includes("oauth token not found") ||
      lowerOutput.includes("user needs to authenticate") ||
      lowerOutput.includes("unauthorized") ||
      lowerOutput.includes("timed out") ||
      lowerOutput.includes("timeout")
    ) {
      return true;
    }
  }

  return false;
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
  const mcpServerMap = useAtomValue(mcpServerMapAtom);
  const { serverId, displayToolName } = parseToolName(toolName);
  const serverName = resolveServerName(mcpServerMap, serverId);
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
      {/* ヘッダー: サーバー名 > ツール名 */}
      <div className="flex items-center gap-2">
        <StateIcon state={displayState} />
        {serverName && (
          <>
            <span className="text-muted-foreground text-sm font-medium">
              {serverName}
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
