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
  AiCodingTool,
} from "../../main/types";
import type { McpServerWithRuntime } from "../hooks/useMcpServers";
import { toast } from "./Toast";
import { useAiCodingToolSettings } from "../hooks/useAiCodingTelemetry";

type Props = {
  client: AiClient;
  servers: McpServerWithRuntime[];
  launchCommand: McpProxyLaunchCommand | null;
  theme: string;
  port: number;
  onClose: () => void;
};

/** クライアント ID → AiCodingTool マッピング（対応ツールのみ） */
const TRACKING_TOOL_MAP: Partial<Record<string, AiCodingTool>> = {
  "claude-code": "claude-code",
  "codex-cli": "codex",
};

/** 使用量記録セクション（フック呼び出しを安定させるためサブコンポーネント化） */
const TrackingSection = ({
  tool,
  port,
}: {
  tool: AiCodingTool;
  port: number;
}): JSX.Element => {
  const { settings, isLoading, refresh } = useAiCodingToolSettings(tool);
  const [isApplying, setIsApplying] = useState(false);

  const handleToggle = (): void => {
    const newEnabled = !(settings?.enabled ?? false);
    void window.electronAPI.aiCodingTelemetry
      .saveToolEnabled(tool, newEnabled)
      .then(() => refresh());
  };

  const handleApply = (): void => {
    if (port === 0) {
      toast.error("受信サーバーが起動していません");
      return;
    }
    setIsApplying(true);
    void window.electronAPI.aiCodingTelemetry
      .applyToTool(tool, port)
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
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
        <Activity size={12} className="text-[var(--text-subtle)]" />
        使用量の記録
      </div>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-3">
        {/* トグル行 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-primary)]">
              トークン数・API呼び出し回数を収集
            </p>
            {settings?.appliedAt && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--badge-success-text,#16a34a)]">
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
              onClick={handleToggle}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  settings?.enabled
                    ? "bg-[var(--badge-success-text)]"
                    : "bg-[var(--text-subtle)]"
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
        {/* 自動設定ボタン */}
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || port === 0}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
        >
          {isApplying ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          設定ファイルに自動書き込み
        </button>
        {port === 0 && (
          <p className="mt-1 text-center text-[10px] text-[var(--text-subtle)]">
            アプリを再起動すると受信サーバーが起動します
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
  theme,
  port,
  onClose,
}: Props): JSX.Element => {
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

  const logo = client.logoPath?.(theme);
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
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={client.name}
                className="h-9 w-9 rounded-lg"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-active)] text-sm font-bold text-[var(--text-muted)]">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <h2
                id="ai-client-modal-title"
                className="text-lg font-bold text-[var(--text-primary)]"
              >
                {client.name} に書き込み
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                登録済みMCPサーバーを設定ファイルへ書き込みます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={writing}
            className="rounded-md p-1 text-[var(--text-muted)] transition hover:opacity-70 disabled:opacity-50"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* 設定ファイルパス */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
            <Info size={12} className="text-[var(--text-subtle)]" />
            設定ファイル
          </div>
          {preview ? (
            <code className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[11px] break-all text-[var(--text-secondary)]">
              {preview.configPath}
              {!preview.exists && (
                <span className="ml-2 text-[var(--text-subtle)]">
                  （新規作成）
                </span>
              )}
            </code>
          ) : previewError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {previewError}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
              <Loader2 size={12} className="animate-spin" />
              読み込み中...
            </div>
          )}
        </div>

        {/* 既存エントリ（Tumikiに無いもの = orphan） */}
        {orphanSlugs.length > 0 && (
          <div className="mb-5">
            <div className="mb-1.5 text-xs font-medium text-[var(--text-primary)]">
              既存エントリ（Tumikiに無いもの、{orphanSlugs.length}件）
              <span className="ml-2 text-[10px] font-normal text-[var(--text-subtle)]">
                チェックを外すと削除されます
              </span>
            </div>
            <ul className="max-h-32 space-y-1.5 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-2">
              {orphanSlugs.map((slug) => {
                const kept = keptOrphanSlugs.has(slug);
                return (
                  <li key={slug}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 transition hover:bg-[var(--bg-card-hover)]">
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={(e) =>
                          toggleOrphanKept(slug, e.target.checked)
                        }
                        disabled={writing}
                        className="h-4 w-4 cursor-pointer accent-[var(--text-primary)]"
                      />
                      <span className="flex-1 font-mono text-xs text-[var(--text-primary)]">
                        {slug}
                      </span>
                      {kept ? (
                        <span className="flex items-center gap-1 rounded bg-[var(--bg-card-hover)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
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
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Tumikiから追加するサーバー（{servers.length}件）
            </span>
            {servers.length > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={writing}
                  className="h-3.5 w-3.5 cursor-pointer accent-[var(--text-primary)]"
                />
                全選択
              </label>
            )}
          </div>
          {servers.length === 0 ? (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-xs text-[var(--text-subtle)]">
              書き込み可能なMCPサーバーがありません
            </div>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-2">
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
                        cls: "bg-[var(--bg-card-hover)] text-[var(--text-muted)]",
                        icon: null,
                        label: "スキップ",
                        title: "書き込まずスキップします",
                      };
                return (
                  <li key={server.slug}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 transition hover:bg-[var(--bg-card-hover)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          toggleSelected(server.slug, e.target.checked)
                        }
                        disabled={writing}
                        className="h-4 w-4 cursor-pointer accent-[var(--text-primary)]"
                      />
                      <span className="flex-1 text-xs text-[var(--text-primary)]">
                        {server.name}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-subtle)]">
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

        {/* 使用量記録セクション（claude-code / codex-cli のみ表示） */}
        {TRACKING_TOOL_MAP[client.id] !== undefined && (
          <TrackingSection
            tool={TRACKING_TOOL_MAP[client.id] as AiCodingTool}
            port={port}
          />
        )}

        {/* 区切り */}
        <div className="mb-5 border-t border-[var(--border)]" />

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={writing}
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:opacity-80 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void handleWrite()}
            disabled={!isReady || writing || !hasChanges}
            className="flex items-center gap-2 rounded-lg bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90 disabled:opacity-50"
          >
            {writing && <Loader2 size={14} className="animate-spin" />}
            {writing ? "書き込み中..." : "書き込み"}
          </button>
        </div>
      </div>
    </div>
  );
};
