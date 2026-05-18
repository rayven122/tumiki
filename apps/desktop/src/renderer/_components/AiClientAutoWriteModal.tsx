import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Info,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Activity,
  Check,
} from "lucide-react";
import type { AiClient } from "../data/ai-clients";
import type {
  AiClientPreview,
  McpEntry,
  McpProxyLaunchCommand,
  ConfigurableAiCodingTool,
} from "../../main/types";
import type { McpServerWithRuntime } from "../hooks/useMcpServers";
import { toast } from "./Toast";
import {
  useAiCodingTelemetryReceiverStatus,
  useAiCodingToolSettings,
} from "../hooks/useAiCodingTelemetry";
import { TRACKING_TOOL_MAP } from "../utils/ai-coding-telemetry-tools";

type Props = {
  client: AiClient;
  servers: McpServerWithRuntime[];
  launchCommand: McpProxyLaunchCommand | null;
  port: number;
  onClose: () => void;
};

// 使用量記録セクション（フック安定化のためサブコンポーネント化）
const TrackingSection = ({
  tool,
  port,
}: {
  tool: ConfigurableAiCodingTool;
  port: number;
}): JSX.Element => {
  const { settings, isLoading, refresh } = useAiCodingToolSettings(tool);
  const { receiverStatus, isLoading: isReceiverStatusLoading } =
    useAiCodingTelemetryReceiverStatus();
  const [isApplying, setIsApplying] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = (): void => {
    if (isToggling) return;
    setIsToggling(true);
    const newEnabled = !(settings?.enabled ?? false);
    void window.electronAPI.aiCodingTelemetry
      .saveToolEnabled(tool, newEnabled)
      .then(() => refresh())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`使用量記録の設定変更に失敗しました: ${message}`);
        refresh();
      })
      .finally(() => setIsToggling(false));
  };

  const handleApply = (): void => {
    if (port === 0) {
      toast.error("受信サーバーが起動していません");
      return;
    }
    setIsApplying(true);
    void window.electronAPI.aiCodingTelemetry
      .applyToTool(tool)
      .then((result) => {
        if (result.success) {
          toast.success("使用量記録の設定ファイルに書き込みました");
          refresh();
        } else {
          toast.error(
            `使用量記録の書き込みに失敗しました: ${result.errorCode ?? "UNKNOWN"}`,
          );
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`使用量記録の書き込みに失敗しました: ${message}`);
      })
      .finally(() => setIsApplying(false));
  };

  return (
    <div className="mb-5">
      {/* セクションヘッダー */}
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-800 dark:text-white">
        <Activity size={12} className="text-gray-400 dark:text-zinc-500" />
        使用量の記録
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        {/* トグル行 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">
              トークン数・API呼び出し回数を収集
            </p>
            {settings?.appliedAt && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Check size={10} />
                連携済み{" "}
                {new Date(settings.appliedAt).toLocaleDateString("ja-JP")}
                {settings.appliedPort !== undefined &&
                  ` (port: ${settings.appliedPort})`}
              </p>
            )}
          </div>
          {!isLoading && (
            <button
              type="button"
              role="switch"
              aria-checked={settings?.enabled ?? false}
              aria-label="使用量記録を有効化"
              disabled={isToggling}
              onClick={handleToggle}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  settings?.enabled
                    ? "bg-emerald-500"
                    : "bg-gray-300 dark:bg-zinc-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    settings?.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </div>
            </button>
          )}
        </div>
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                Tumiki Analytics MCP
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500 dark:text-zinc-500">
                {isReceiverStatusLoading
                  ? "確認中"
                  : receiverStatus?.listening
                    ? `受信中 (port: ${String(receiverStatus.port)})`
                    : "AI 起動時に開始"}
              </p>
            </div>
            {receiverStatus?.listening && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {receiverStatus.mode === "gui" ? "GUI" : "MCP"}
              </span>
            )}
          </div>
        </div>

        {/* 自動設定ボタン */}
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || port === 0}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {isApplying ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          設定ファイルに自動書き込み
        </button>
        {port === 0 && (
          <p className="mt-1 text-center text-[10px] text-gray-400 dark:text-zinc-500">
            設定後、AI クライアント起動時に Tumiki Analytics MCP
            が受信サーバーを起動します
          </p>
        )}
      </div>
    </div>
  );
};

const buildEntry = (
  launchCommand: McpProxyLaunchCommand,
  slug: string,
): McpEntry => ({
  command: launchCommand.command,
  args: [...launchCommand.args, "--server", slug],
});

export const AiClientAutoWriteModal = ({
  client,
  servers,
  launchCommand,
  port,
  onClose,
}: Props): JSX.Element => {
  const trackingTool = TRACKING_TOOL_MAP[client.id];
  const [activeTab, setActiveTab] = useState<"mcp" | "tracking">("mcp");
  const [preview, setPreview] = useState<AiClientPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Tumiki から追加・上書きするサーバー（チェック=書き込む）
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
    () => new Set(servers.map((s) => s.slug)),
  );
  // 既存エントリ（Tumiki に無い orphan）の保持状態（チェック=保持、外す=削除）
  const [keptOrphanSlugs, setKeptOrphanSlugs] = useState<Set<string>>(
    () => new Set(),
  );
  const [writing, setWriting] = useState(false);

  // ポーリングによる effect 再実行を避けるため ref 経由で参照
  const serversRef = useRef(servers);
  serversRef.current = servers;

  // プレビュー取得（モーダルを開いた時の1回のみ実行し、ポーリングで再読込しない）
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await window.electronAPI.aiClient.getPreview(client.id);
        if (cancelled) return;
        setPreview(result);
        // orphan は初期状態で全て「保持」
        const tumikiSlugs = new Set(serversRef.current.map((s) => s.slug));
        const orphans = result.existingServerSlugs.filter(
          (slug) => !tumikiSlugs.has(slug),
        );
        setKeptOrphanSlugs(new Set(orphans));
      } catch (error) {
        if (cancelled) return;
        setPreviewError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client.id]);

  // Escape で閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !writing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, writing]);

  const conflictingSlugs = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set(
      servers
        .filter((s) => preview.existingServerSlugs.includes(s.slug))
        .map((s) => s.slug),
    );
  }, [preview, servers]);

  const orphanSlugs = useMemo(() => {
    if (!preview) return [] as string[];
    const tumikiSlugs = new Set(servers.map((s) => s.slug));
    return preview.existingServerSlugs.filter((slug) => !tumikiSlugs.has(slug));
  }, [preview, servers]);

  const removeSlugs = useMemo(() => {
    if (!preview) return [] as string[];
    const existingSet = new Set(preview.existingServerSlugs);
    const list: string[] = [];
    // 1. Tumikiにあり、既存にも同名slugがあるが、ユーザーがチェックを外したもの → 削除
    for (const server of servers) {
      if (!selectedSlugs.has(server.slug) && existingSet.has(server.slug)) {
        list.push(server.slug);
      }
    }
    // 2. Tumikiに無い既存エントリ（orphan）で「保持」チェックを外したもの → 削除
    for (const slug of orphanSlugs) {
      if (!keptOrphanSlugs.has(slug)) list.push(slug);
    }
    return list;
  }, [preview, servers, selectedSlugs, orphanSlugs, keptOrphanSlugs]);

  const toggleSelected = (slug: string, checked: boolean): void => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedSlugs(new Set(checked ? servers.map((s) => s.slug) : []));
  };

  const toggleOrphanKept = (slug: string, kept: boolean): void => {
    setKeptOrphanSlugs((prev) => {
      const next = new Set(prev);
      if (kept) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const handleWrite = async (): Promise<void> => {
    if (!launchCommand) {
      toast.error("起動コマンドが取得できていません");
      return;
    }
    if (selectedSlugs.size === 0 && removeSlugs.length === 0) {
      toast.error("書き込みまたは削除する項目を選択してください");
      return;
    }
    setWriting(true);
    const entries: Record<string, McpEntry> = {};
    for (const slug of selectedSlugs) {
      entries[slug] = buildEntry(launchCommand, slug);
    }
    try {
      const result = await window.electronAPI.aiClient.writeConfig({
        clientId: client.id,
        entries,
        removeSlugs,
      });
      const parts: string[] = [];
      if (result.addedCount > 0)
        parts.push(`${String(result.addedCount)} 件追加`);
      if (result.replacedCount > 0)
        parts.push(`${String(result.replacedCount)} 件上書き`);
      if (result.removedCount > 0)
        parts.push(`${String(result.removedCount)} 件削除`);
      const summary = parts.length > 0 ? parts.join(" / ") : "変更なし";
      const backupHint = result.backupPath
        ? `バックアップ: ${result.backupPath}`
        : "新規作成";
      toast.success(
        `${client.name} に書き込みました（${summary}）。${backupHint}。${client.name} を再起動して反映してください。`,
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `書き込みに失敗しました: ${error.message}`
          : "書き込みに失敗しました",
      );
    } finally {
      setWriting(false);
    }
  };

  const logo = client.logoPath?.("light");
  const allChecked =
    servers.length > 0 && selectedSlugs.size === servers.length;
  const isReady = launchCommand !== null && preview !== null;
  const hasChanges = selectedSlugs.size > 0 || removeSlugs.length > 0;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={writing ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-client-modal-title"
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-8 dark:border-white/[.08] dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="flex items-center justify-center overflow-hidden rounded-lg bg-zinc-100/95 p-[2px]">
                <img
                  src={logo}
                  alt={client.name}
                  className="h-9 w-9 rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100/95 p-[2px] text-sm font-bold text-zinc-400 dark:text-zinc-500">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <h2
                id="ai-client-modal-title"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                {client.name} に書き込み
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                登録済みMCPサーバーを設定ファイルへ書き込みます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={writing}
            className="rounded-md p-1 text-gray-500 transition hover:opacity-70 disabled:opacity-50 dark:text-zinc-500"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* 設定ファイルパス */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-900 dark:text-white">
            <Info size={12} className="text-gray-400 dark:text-zinc-600" />
            設定ファイル
          </div>
          {preview ? (
            <code className="block rounded-lg border border-gray-100 bg-[#e8eaed] px-3 py-2 font-mono text-[11px] break-all text-gray-600 dark:border-white/[.03] dark:bg-[#0a0a0a] dark:text-zinc-400">
              {preview.configPath}
              {!preview.exists && (
                <span className="ml-2 text-gray-400 dark:text-zinc-600">
                  （新規作成）
                </span>
              )}
            </code>
          ) : previewError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {previewError}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-600">
              <Loader2 size={12} className="animate-spin" />
              読み込み中...
            </div>
          )}
        </div>

        {/* タブ切り替え（Claude Code / Codex のみ表示） */}
        {trackingTool !== undefined && (
          <div className="mb-4 flex gap-1 rounded-lg bg-[#e8eaed] p-1 dark:bg-[#0a0a0a]">
            <button
              type="button"
              onClick={() => setActiveTab("mcp")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "mcp"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-[#111111] dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white"
              }`}
            >
              MCP接続
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracking")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "tracking"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-[#111111] dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white"
              }`}
            >
              使用量の記録
            </button>
          </div>
        )}

        {/* 使用量の記録タブ */}
        {trackingTool !== undefined && activeTab === "tracking" && (
          <TrackingSection tool={trackingTool} port={port} />
        )}

        {/* MCP接続タブ（タブなし or "mcp" タブ選択時） */}
        {(trackingTool === undefined || activeTab === "mcp") && (
          <>
            {/* 既存エントリ（Tumikiに無いもの = orphan） */}
            {orphanSlugs.length > 0 && (
              <div className="mb-5">
                <div className="mb-1.5 text-xs font-medium text-gray-900 dark:text-white">
                  既存エントリ（Tumikiに無いもの、{orphanSlugs.length}件）
                  <span className="ml-2 text-[10px] font-normal text-gray-400 dark:text-zinc-600">
                    チェックを外すと削除されます
                  </span>
                </div>
                <ul className="max-h-32 space-y-1.5 overflow-auto rounded-lg border border-gray-100 bg-[#e8eaed] p-2 dark:border-white/[.03] dark:bg-[#0a0a0a]">
                  {orphanSlugs.map((slug) => {
                    const kept = keptOrphanSlugs.has(slug);
                    return (
                      <li key={slug}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 transition hover:bg-black/[.02] dark:bg-white/[.04]">
                          <input
                            type="checkbox"
                            checked={kept}
                            onChange={(e) =>
                              toggleOrphanKept(slug, e.target.checked)
                            }
                            disabled={writing}
                            className="h-4 w-4 cursor-pointer accent-gray-900 dark:accent-white"
                          />
                          <span className="flex-1 font-mono text-xs text-gray-900 dark:text-white">
                            {slug}
                          </span>
                          {kept ? (
                            <span className="flex items-center gap-1 rounded bg-black/[.02] px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/[.04] dark:text-zinc-500">
                              保持
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
                              <Trash2 size={10} />
                              削除
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Tumiki から追加するサーバー（チェックボックス） */}
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  Tumikiから追加するサーバー（{servers.length}件）
                </span>
                {servers.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-500">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                      disabled={writing}
                      className="h-3.5 w-3.5 cursor-pointer accent-gray-900 dark:accent-white"
                    />
                    全選択
                  </label>
                )}
              </div>
              {servers.length === 0 ? (
                <div className="rounded-lg border border-gray-100 bg-[#e8eaed] px-3 py-2 text-xs text-gray-400 dark:border-white/[.03] dark:bg-[#0a0a0a] dark:text-zinc-600">
                  書き込み可能なMCPサーバーがありません
                </div>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-auto rounded-lg border border-gray-100 bg-[#e8eaed] p-2 dark:border-white/[.03] dark:bg-[#0a0a0a]">
                  {servers.map((server) => {
                    const checked = selectedSlugs.has(server.slug);
                    const inExisting = conflictingSlugs.has(server.slug);
                    // チェック × 既存 の組み合わせで4種のバッジを切替
                    const badge = checked
                      ? inExisting
                        ? {
                            cls: "bg-amber-500/15 text-amber-400",
                            icon: <AlertTriangle size={10} />,
                            label: "上書き",
                            title: "既存設定を上書きします",
                          }
                        : {
                            cls: "bg-emerald-500/15 text-emerald-400",
                            icon: <CheckCircle2 size={10} />,
                            label: "新規",
                            title: "新規追加します",
                          }
                      : inExisting
                        ? {
                            cls: "bg-red-500/15 text-red-400",
                            icon: <Trash2 size={10} />,
                            label: "削除",
                            title: "設定ファイルから削除します",
                          }
                        : {
                            cls: "bg-black/[.02] dark:bg-white/[.04] text-gray-500 dark:text-zinc-500",
                            icon: null,
                            label: "スキップ",
                            title: "書き込まずスキップします",
                          };
                    return (
                      <li key={server.slug}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 transition hover:bg-black/[.02] dark:bg-white/[.04]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              toggleSelected(server.slug, e.target.checked)
                            }
                            disabled={writing}
                            className="h-4 w-4 cursor-pointer accent-gray-900 dark:accent-white"
                          />
                          <span className="flex-1 text-xs text-gray-900 dark:text-white">
                            {server.name}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-600">
                            {server.slug}
                          </span>
                          <span
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${badge.cls}`}
                            title={badge.title}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 区切り */}
            <div className="mb-5 border-t border-gray-200 dark:border-white/[.08]" />

            {/* ボタン */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={writing}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:opacity-80 disabled:opacity-50 dark:border-white/[.08] dark:text-zinc-400"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleWrite()}
                disabled={!isReady || writing || !hasChanges}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {writing && <Loader2 size={14} className="animate-spin" />}
                {writing ? "書き込み中..." : "書き込み"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
