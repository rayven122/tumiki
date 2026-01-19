"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

type McpToolCallProps = {
  toolName: string; // "linear__list_teams" or "cmjiutji900014xhu829keknh__context7__resolve-library-id"
  state: "call" | "partial-call" | "result" | "error";
  input?: unknown;
  output?: unknown;
};

/**
 * ツール名からサーバー名とツール名を分離
 * "linear__list_teams" → { serverName: "linear", displayToolName: "list_teams" }
 * "cmjiutji900014xhu829keknh__context7__resolve-library-id" → { serverName: "context7", displayToolName: "resolve-library-id" }
 */
const parseToolName = (
  fullToolName: string,
): { serverName: string; displayToolName: string } => {
  const parts = fullToolName.split("__");
  if (parts.length >= 3) {
    // mcpServerId__serverName__toolName 形式
    return {
      serverName: parts[1] ?? "unknown",
      displayToolName: parts.slice(2).join("__"),
    };
  }
  if (parts.length === 2) {
    // serverName__toolName 形式
    return {
      serverName: parts[0] ?? "unknown",
      displayToolName: parts[1] ?? "unknown",
    };
  }
  return { serverName: "unknown", displayToolName: fullToolName };
};

/**
 * 状態に応じたアイコンを返す
 */
const StateIcon = ({
  state,
}: {
  state: "call" | "partial-call" | "result" | "error";
}) => {
  switch (state) {
    case "call":
    case "partial-call":
      return (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      );
    case "result":
      return <span className="text-green-600">✓</span>;
    case "error":
      return <span className="text-red-600">✗</span>;
  }
};

/**
 * JSON を整形して表示（長い場合は折りたたみ）
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
        <pre className="bg-muted/50 mt-1 max-h-60 overflow-auto rounded p-2 text-xs">
          {jsonString}
        </pre>
      )}
    </div>
  );
};

/**
 * 出力からエラー状態を検出する
 * MCPエラーは以下の形式で返される:
 * - { content: [...], isError: true }
 * - "Failed to execute tool..." (文字列形式のエラー)
 */
const detectErrorFromOutput = (output: unknown): boolean => {
  // オブジェクト形式: { isError: true }
  if (output && typeof output === "object") {
    const outputObj = output as { isError?: boolean };
    if (outputObj.isError === true) return true;
  }

  // 文字列形式: エラーメッセージを含む場合
  if (typeof output === "string") {
    const lowerOutput = output.toLowerCase();
    // エラーを示すキーワードをチェック
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
 * MCPツール呼び出し表示コンポーネント
 */
export const McpToolCall = ({
  toolName,
  state,
  input,
  output,
}: McpToolCallProps) => {
  const { serverName, displayToolName } = parseToolName(toolName);
  const isLoading = state === "call" || state === "partial-call";

  // stateが"result"でも、outputにisError:trueがあればエラーとして扱う
  const outputHasError = detectErrorFromOutput(output);

  // 実際に表示する状態（outputのisErrorでオーバーライド）
  const displayState = state === "result" && outputHasError ? "error" : state;

  return (
    <div
      className={cn(
        "border-border bg-muted/30 my-2 rounded-lg border p-3",
        isLoading && "animate-pulse",
      )}
    >
      {/* ヘッダー: サーバー名 > ツール名 */}
      <div className="flex items-center gap-2">
        <StateIcon state={displayState} />
        <span className="text-muted-foreground text-sm font-medium">
          {serverName}
        </span>
        <span className="text-muted-foreground/50">&gt;</span>
        <span className="text-foreground text-sm font-semibold">
          {displayToolName}
        </span>
      </div>

      {/* パラメータ（入力） */}
      {input !== undefined && input !== null && (
        <JsonPreview data={input} label="パラメータ" defaultExpanded={true} />
      )}

      {/* 結果（出力） */}
      {state === "result" && output !== undefined && output !== null && (
        <JsonPreview data={output} label="結果" defaultExpanded={false} />
      )}

      {/* エラー */}
      {state === "error" && output !== undefined && (
        <div className="mt-2 text-sm text-red-600">
          エラー: {String(output)}
        </div>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="text-muted-foreground mt-2 text-xs">実行中...</div>
      )}
    </div>
  );
};
