import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { X, KeyRound, Info, RefreshCw, ChevronDown } from "lucide-react";
import type {
  GetServerEditDetailOutput,
  GetServerEditDetailConnection,
} from "../../main/types";
import { CREDENTIALS_MASK_VALUE } from "../../shared/mcp.constants";
import { toast } from "./Toast";

type EditMcpServerModalProps = {
  serverId: number;
  onClose: () => void;
  onSuccess: () => void;
};

/** connectionId ごとの入力値（key → value） */
type CredentialsInputMap = Record<number, Record<string, string>>;

/** UIフェーズ。credentials 変更を含む保存後は再起動の案内を出す */
type Phase = "editing" | "success-with-restart";

/** サーバー名 / 説明 / 各接続の credentials を編集するモーダル */
export const EditMcpServerModal = ({
  serverId,
  onClose,
  onSuccess,
}: EditMcpServerModalProps): JSX.Element => {
  const [detail, setDetail] = useState<GetServerEditDetailOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [credentialsInput, setCredentialsInput] = useState<CredentialsInputMap>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>("editing");

  // 初期データ取得（マスク済み credentials キー一覧 + 名前/説明）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.electronAPI.mcp
      .getServerEditDetail({ id: serverId })
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setName(result.name);
        setDescription(result.description);
        // 各 connection の credentials を MASK で初期化（既存値が存在するキーのみ）
        const initial: CredentialsInputMap = {};
        for (const conn of result.connections) {
          initial[conn.id] = Object.fromEntries(
            conn.credentialKeys.map((key) => [key, CREDENTIALS_MASK_VALUE]),
          );
        }
        setCredentialsInput(initial);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "編集情報の取得に失敗しました";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  // Escape で閉じる（送信中は閉じない）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      if (submitting) return;
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  const setCredentialValue = (
    connectionId: number,
    key: string,
    value: string,
  ): void => {
    setCredentialsInput((prev) => ({
      ...prev,
      [connectionId]: { ...(prev[connectionId] ?? {}), [key]: value },
    }));
  };

  // 名前/説明が変更されたか
  const isNameDescriptionDirty = useMemo(() => {
    if (!detail) return false;
    return name !== detail.name || description !== detail.description;
  }, [detail, name, description]);

  // credentials が実質的に変更されたかを connection 単位で算出
  const dirtyConnectionIds = useMemo(() => {
    if (!detail) return new Set<number>();
    const dirty = new Set<number>();
    for (const conn of detail.connections) {
      const inputs = credentialsInput[conn.id] ?? {};
      const hasNewValue = Object.values(inputs).some(
        (value) => value !== CREDENTIALS_MASK_VALUE && value.trim() !== "",
      );
      if (hasNewValue) dirty.add(conn.id);
    }
    return dirty;
  }, [detail, credentialsInput]);

  const canSubmit =
    !!detail &&
    !submitting &&
    name.trim() !== "" &&
    (isNameDescriptionDirty || dirtyConnectionIds.size > 0);

  const handleSubmit = async (): Promise<void> => {
    if (!detail) return;
    setSubmitting(true);

    // 名前/説明と credentials は別 IPC かつ別トランザクションのため、
    // 並列実行すると部分失敗時に「名前は保存されたが credentials は失敗」など
    // 不整合な状態を生む。順次実行で先行成功分をユーザーに明示できるようにする。
    const savedSteps: string[] = [];

    try {
      if (isNameDescriptionDirty) {
        await window.electronAPI.mcp.updateServer({
          id: serverId,
          name: name !== detail.name ? name : undefined,
          description:
            description !== detail.description ? description : undefined,
        });
        savedSteps.push("名前・説明");
      }

      for (const connectionId of dirtyConnectionIds) {
        await window.electronAPI.mcp.updateServerConnectionCredentials({
          connectionId,
          credentials: credentialsInput[connectionId] ?? {},
        });
        // ユーザー向け文言には DB の内部 ID ではなく接続名を出す。
        // 名前未取得・名前が空の場合のみ ID にフォールバックする
        const connName =
          detail.connections.find((c) => c.id === connectionId)?.name ??
          String(connectionId);
        savedSteps.push(`接続「${connName}」の認証情報`);
      }

      onSuccess();
      if (dirtyConnectionIds.size > 0) {
        // credentials を変更した場合は再起動の案内をモーダル内で表示
        setPhase("success-with-restart");
      } else {
        toast.success("保存しました");
        onClose();
      }
    } catch (err) {
      const failureMessage =
        err instanceof Error ? err.message : "保存に失敗しました";
      // 先行成功分があるかで文言を変え、ユーザーに「どこまで保存されたか」を伝える
      if (savedSteps.length > 0) {
        toast.error(
          `${savedSteps.join(" / ")}は保存しましたが、後続の更新に失敗しました: ${failureMessage}`,
        );
        // 一部成功している以上、画面上のサーバー情報は古いままなので再取得を促す
        onSuccess();
      } else {
        toast.error(failureMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-mcp-server-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
        <div className="mb-1 flex items-start justify-between">
          <h2
            id="edit-mcp-server-modal-title"
            className="text-xl font-bold text-[var(--text-primary)]"
          >
            サーバー設定を編集
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--text-muted)] transition hover:opacity-70 disabled:opacity-50"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {phase === "success-with-restart" ? (
          <RestartGuidance onClose={onClose} />
        ) : loading ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            読み込み中...
          </p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-[var(--badge-error-text)]">
            {error}
          </p>
        ) : detail ? (
          <EditingForm
            detail={detail}
            name={name}
            description={description}
            credentialsInput={credentialsInput}
            submitting={submitting}
            canSubmit={canSubmit}
            onChangeName={setName}
            onChangeDescription={setDescription}
            onChangeCredential={setCredentialValue}
            onClose={onClose}
            onSubmit={() => void handleSubmit()}
          />
        ) : null}
      </div>
    </div>
  );
};

/** 編集フォーム本体 */
const EditingForm = ({
  detail,
  name,
  description,
  credentialsInput,
  submitting,
  canSubmit,
  onChangeName,
  onChangeDescription,
  onChangeCredential,
  onClose,
  onSubmit,
}: {
  detail: GetServerEditDetailOutput;
  name: string;
  description: string;
  credentialsInput: CredentialsInputMap;
  submitting: boolean;
  canSubmit: boolean;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeCredential: (
    connectionId: number,
    key: string,
    value: string,
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}): JSX.Element => {
  const isMultiConnection = detail.connections.length > 1;

  return (
    <>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        サーバー名・説明と、接続単位の認証情報を更新できます。
      </p>

      {/* サーバー名 */}
      <div className="mb-4">
        <label
          htmlFor="edit-mcp-server-name"
          className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
        >
          サーバー名<span className="text-[var(--badge-error-text)]">*</span>
        </label>
        <input
          id="edit-mcp-server-name"
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none disabled:opacity-50"
        />
      </div>

      {/* 説明 */}
      <div className="mb-6">
        <label
          htmlFor="edit-mcp-server-description"
          className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
        >
          説明
        </label>
        <textarea
          id="edit-mcp-server-description"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          disabled={submitting}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)] disabled:opacity-50"
          placeholder="サーバーの説明（任意）"
        />
      </div>

      {/* 認証情報セクション */}
      <div className="mb-6 space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            キーの追加・削除はこの画面では行えません。既存キーの値のみ更新できます。
          </span>
        </div>
        {detail.connections.map((conn) => (
          <CredentialsSection
            key={conn.id}
            connection={conn}
            isCollapsible={isMultiConnection}
            values={credentialsInput[conn.id] ?? {}}
            submitting={submitting}
            onChange={onChangeCredential}
          />
        ))}
      </div>

      {/* フッターボタン */}
      <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-5">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:opacity-80 disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
      </div>
    </>
  );
};

/** 接続単位の credentials セクション。OAuth / キーなしは情報表示のみ */
const CredentialsSection = ({
  connection,
  isCollapsible,
  values,
  submitting,
  onChange,
}: {
  connection: GetServerEditDetailConnection;
  isCollapsible: boolean;
  values: Record<string, string>;
  submitting: boolean;
  onChange: (connectionId: number, key: string, value: string) => void;
}): JSX.Element => {
  const body =
    connection.authType === "OAUTH" ? (
      <div className="flex items-start gap-2 px-3 py-2 text-xs text-[var(--text-muted)]">
        <KeyRound size={14} className="mt-0.5 shrink-0" />
        <span>
          OAuth認証情報はメニューの「OAuthを再設定」から更新してください。
        </span>
      </div>
    ) : connection.credentialKeys.length === 0 ? (
      <p className="px-3 py-2 text-xs text-[var(--text-muted)]">認証情報なし</p>
    ) : (
      <div className="space-y-3 px-3 py-3">
        {connection.credentialKeys.map((key) => {
          // credential 名にスペースや記号が含まれても HTML id 属性として有効な値になるようサニタイズする
          const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
          const inputId = `edit-mcp-cred-${String(connection.id)}-${safeKey}`;
          return (
            <div key={key}>
              <label
                htmlFor={inputId}
                className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
              >
                {key}
              </label>
              <input
                id={inputId}
                type="password"
                autoComplete="new-password"
                value={values[key] ?? ""}
                onChange={(e) => onChange(connection.id, key, e.target.value)}
                disabled={submitting}
                placeholder={CREDENTIALS_MASK_VALUE}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)] disabled:opacity-50"
              />
            </div>
          );
        })}
        <p className="text-[10px] text-[var(--text-subtle)]">
          空欄またはマスク表示のままだと、既存の値が維持されます。
        </p>
      </div>
    );

  if (!isCollapsible) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)]">
        {body}
      </div>
    );
  }

  return (
    <details className="group rounded-lg border border-[var(--border-subtle)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm text-[var(--text-primary)]">
        <span className="truncate">{connection.name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {connection.authType}
          </span>
          {/* list-none で標準の▶が消えるため、ChevronDown で開閉状態を明示する */}
          <ChevronDown
            size={14}
            className="text-[var(--text-muted)] transition-transform group-open:rotate-180"
          />
        </div>
      </summary>
      {body}
    </details>
  );
};

/** credentials 変更後の再起動案内 */
const RestartGuidance = ({ onClose }: { onClose: () => void }): JSX.Element => (
  <div className="space-y-5 py-2">
    <div className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-4 py-3">
      <RefreshCw
        size={18}
        className="mt-0.5 shrink-0 text-[var(--text-primary)]"
      />
      <div className="space-y-1 text-sm text-[var(--text-primary)]">
        <p className="font-medium">保存しました</p>
        <p className="text-xs text-[var(--text-muted)]">
          認証情報の変更を反映するには、接続中のAIクライアントを再起動してください。
        </p>
      </div>
    </div>
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-[var(--text-primary)] px-6 py-2.5 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90"
      >
        閉じる
      </button>
    </div>
  </div>
);
