"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { TypingIndicator } from "./typing-indicator";
import { useAtomValue } from "jotai";
import { mcpServerMapAtom, resolveServerName } from "@/atoms/mcpServerMapAtom";

// AI SDK 6 のツール状態
type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

type McpToolCallProps = {
  toolName: string; // "Linear MCP__linear__list_teams" or "Linear MCP__search_tools"
  state: ToolState;
  input?: unknown;
  output?: unknown;
};

/**
 * ツール名からMCPサーバーIDと表示用ツール名を抽出
 *
 * 形式: "{mcpServerId}__{normalizedName}__{toolName}" または "{mcpServerId}__{metaToolName}"
 *
 * @example
 * "cm7qwxyz123__linear__list_teams" → { serverId: "cm7qwxyz123", displayToolName: "list_teams" }
 * "cm7qwxyz123__search_tools" → { serverId: "cm7qwxyz123", displayToolName: "search_tools" }
 */
const parseToolName = (
  fullToolName: string,
): { serverId: string; displayToolName: string } => {
  const parts = fullToolName.split("__");

  if (parts.length >= 3) {
    // {mcpServerId}__{normalizedName}__{toolName} 形式
    // 最初がサーバーID、残りの最後がツール名
    return {
      serverId: parts[0] ?? "",
      displayToolName: parts.slice(2).join("__"),
    };
  }

  if (parts.length === 2) {
    // {mcpServerId}__{metaToolName} 形式（Dynamic Search メタツール）
    return {
      serverId: parts[0] ?? "",
      displayToolName: parts[1] ?? "",
    };
  }

  // フォールバック: パースできない場合はそのまま表示
  return {
    serverId: "",
    displayToolName: fullToolName,
  };
};

/**
 * 状態に応じたアイコンを返す
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
  const mcpServerMap = useAtomValue(mcpServerMapAtom);
  const { serverId, displayToolName } = parseToolName(toolName);
  const serverName = resolveServerName(mcpServerMap, serverId);
  const isLoading = state === "input-streaming" || state === "input-available";

  // stateが"output-available"でも、outputにisError:trueがあればエラーとして扱う
  const outputHasError = detectErrorFromOutput(output);

  // 実際に表示する状態（outputのisErrorでオーバーライド）
  const displayState: ToolState =
    state === "output-available" && outputHasError ? "output-error" : state;

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

      {/* 結果（出力）- エラーでない場合のみ表示 */}
      {displayState === "output-available" &&
        output !== undefined &&
        output !== null && (
          <JsonPreview data={output} label="結果" defaultExpanded={false} />
        )}

      {/* エラー - displayState で判定（outputHasError を含む） */}
      {displayState === "output-error" && output !== undefined && (
        <div>
          {typeof output === "object" ? (
            <JsonPreview data={output} label="エラー" defaultExpanded={true} />
          ) : (
            <div className="mt-2 text-sm">エラー: {String(output)}</div>
          )}
        </div>
      )}
    </div>
  );
};
