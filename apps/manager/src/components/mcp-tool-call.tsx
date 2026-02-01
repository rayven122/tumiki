"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, KeyIcon } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { TypingIndicator } from "./typing-indicator";
import { useAtomValue } from "jotai";
import { mcpServerMapAtom, resolveServerName } from "@/atoms/mcpServerMapAtom";
import { useReauthenticateFromChat } from "@/hooks/useReauthenticateFromChat";

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
 * 認証エラー情報の型
 */
type AuthErrorInfo = {
  requiresReauth: boolean;
  mcpServerId: string;
};

/**
 * 出力から認証エラー情報を抽出する
 * 再認証が必要な場合はmcpServerIdを含むオブジェクトを返す
 *
 * requiresReauth: true が設定されている場合は errorType に関係なく
 * 認証エラーとして扱う（401エラーやReAuthRequiredエラーに対応）
 */
const extractAuthError = (output: unknown): AuthErrorInfo | null => {
  if (!output || typeof output !== "object") return null;

  const obj = output as {
    isError?: boolean;
    errorType?: string;
    requiresReauth?: boolean;
    mcpServerId?: string;
  };

  // requiresReauth: true があれば認証エラーとして扱う
  if (
    obj.isError === true &&
    obj.requiresReauth === true &&
    typeof obj.mcpServerId === "string"
  ) {
    return {
      requiresReauth: true,
      mcpServerId: obj.mcpServerId,
    };
  }

  return null;
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
 * 再認証バナーコンポーネント
 * UX原則: 視覚的階層、認知負荷の軽減、ポジティブなフレーミング
 */
const ReauthBanner = ({
  mcpServerId,
  redirectTo,
}: {
  mcpServerId: string;
  redirectTo: string;
}) => {
  const { startReauthentication, isPending } = useReauthenticateFromChat({
    redirectTo,
  });

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2">
        <span className="text-sm text-amber-600 dark:text-amber-400">⚠️</span>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          認証の有効期限が切れました
        </p>
      </div>
      <button
        type="button"
        onClick={() => startReauthentication(mcpServerId)}
        disabled={isPending}
        className={cn(
          "flex shrink-0 items-center gap-1.5",
          "rounded-md border border-amber-300 px-2.5 py-1 text-xs font-medium",
          "bg-white text-amber-700",
          "hover:bg-amber-50 active:bg-amber-100",
          "dark:border-amber-700 dark:bg-transparent dark:text-amber-300",
          "dark:hover:bg-amber-900/30 dark:active:bg-amber-900/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-150",
        )}
      >
        {isPending ? (
          <>
            <span className="animate-spin text-xs">⏳</span>
            準備中...
          </>
        ) : (
          <>
            <KeyIcon className="size-3" />
            再認証
          </>
        )}
      </button>
    </div>
  );
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
  const pathname = usePathname();
  const { serverId, displayToolName } = parseToolName(toolName);
  const serverName = resolveServerName(mcpServerMap, serverId);
  const isLoading = state === "input-streaming" || state === "input-available";

  // stateが"output-available"でも、outputにisError:trueがあればエラーとして扱う
  const outputHasError = detectErrorFromOutput(output);

  // 認証エラー情報を抽出（再認証ボタン表示用）
  const authError = extractAuthError(output);

  // 実際に表示する状態（outputのisErrorでオーバーライド）
  const displayState: ToolState =
    state === "output-available" && outputHasError ? "output-error" : state;

  // 再認証後に戻るURL（チャット画面）
  // パスから orgSlug と chatId を抽出: /[orgSlug]/chat/[chatId]
  const redirectTo = pathname?.match(/^\/([^/]+)\/chat\/([^/]+)/)
    ? pathname
    : null;

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

      {/* 認証エラー時の再認証バナー */}
      {displayState === "output-error" && authError && redirectTo && (
        <ReauthBanner
          mcpServerId={authError.mcpServerId}
          redirectTo={redirectTo}
        />
      )}

      {/* エラー - displayState で判定（outputHasError を含む） */}
      {displayState === "output-error" &&
        output !== undefined &&
        !authError && (
          <div>
            {typeof output === "object" ? (
              <JsonPreview
                data={output}
                label="エラー"
                defaultExpanded={true}
              />
            ) : (
              <div className="mt-2 text-sm">エラー: {String(output)}</div>
            )}
          </div>
        )}

      {/* 認証エラーの場合はエラー詳細を折りたたみで表示 */}
      {displayState === "output-error" && authError && output !== undefined && (
        <JsonPreview data={output} label="エラー詳細" defaultExpanded={false} />
      )}
    </div>
  );
};
