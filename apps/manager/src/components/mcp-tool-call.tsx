"use client";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, KeyIcon } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { TypingIndicator } from "./typing-indicator";
import { useReauthenticateFromChat } from "@/hooks/useReauthenticateFromChat";
import { useToolOutput } from "@/hooks/useToolOutput";
import { parseToolName } from "@/features/mcps/utils/mcpToolName";
import {
  detectErrorFromOutput,
  extractAuthError,
} from "@/features/mcps/utils/mcpToolError";
import { type ToolState } from "@/features/chat";

type McpToolCallProps = {
  toolName: string; // "linear-mcp__linear__list_teams" or "linear-mcp__search_tools"
  toolCallId: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  /** BigQuery参照（outputがBigQueryに保存されている場合） */
  outputRef?: string;
  /**
   * コンパクトモード（エージェント実行モーダル用）
   * - 再認証バナーを非表示
   * - outputRef フェッチを無効化
   * @default false
   */
  compact?: boolean;
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
  toolCallId,
  state,
  input,
  output: directOutput,
  outputRef,
  compact = false,
}: McpToolCallProps) => {
  const pathname = usePathname();
  const { serverSlug, displayToolName } = parseToolName(toolName);
  const isLoading = state === "input-streaming" || state === "input-available";

  // outputRefがある場合、展開時にBigQueryからフェッチ（compactモードでは無効）
  const [shouldFetch, setShouldFetch] = useState(false);
  const {
    output: fetchedOutput,
    isLoading: isFetchingOutput,
    error: fetchError,
  } = useToolOutput({
    toolCallId: outputRef,
    enabled: !compact && shouldFetch && !!outputRef,
  });

  // 実際に使用するoutput（直接渡されたものまたはフェッチしたもの）
  const output = directOutput ?? fetchedOutput;

  // stateが"output-available"でも、outputにisError:trueがあればエラーとして扱う
  const outputHasError = detectErrorFromOutput(output);

  // 認証エラー情報を抽出（再認証ボタン表示用、compactモードでは無効）
  const authError = compact ? null : extractAuthError(output);

  // 実際に表示する状態（outputのisErrorでオーバーライド）
  const displayState: ToolState =
    state === "output-available" && outputHasError ? "output-error" : state;

  // 再認証後に戻るURL（チャット画面、compactモードでは使用しない）
  // パスから orgSlug と chatId を抽出: /[orgSlug]/chat/[chatId]
  const redirectTo =
    !compact && pathname?.match(/^\/([^/]+)\/chat\/([^/]+)/) ? pathname : null;

  return (
    <div
      className={cn(
        "border-border bg-muted/30 my-2 rounded-lg border p-3",
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

      {/* 結果（出力）- エラーでない場合のみ表示 */}
      {displayState === "output-available" && (
        <>
          {/* outputRefがある場合はオンデマンドフェッチ（compactモードでは非表示） */}
          {!compact &&
            outputRef &&
            !output &&
            !isFetchingOutput &&
            !fetchError && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShouldFetch(true)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  <ChevronRightIcon className="size-3" />
                  結果を読み込む
                </button>
              </div>
            )}
          {/* フェッチ中（compactモードでは非表示） */}
          {!compact && isFetchingOutput && (
            <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
              <TypingIndicator size="sm" />
              <span>結果を読み込み中...</span>
            </div>
          )}
          {/* フェッチエラー（compactモードでは非表示） */}
          {!compact && fetchError && (
            <div className="mt-2 text-xs text-red-600">
              結果の読み込みに失敗しました: {fetchError.message}
            </div>
          )}
          {/* 結果表示 */}
          {output !== undefined && output !== null && (
            <JsonPreview data={output} label="結果" defaultExpanded={false} />
          )}
        </>
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
