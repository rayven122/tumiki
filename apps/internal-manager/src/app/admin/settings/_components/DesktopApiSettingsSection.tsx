"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

type SettingsFormState = {
  organizationName: string;
  organizationSlug: string;
  catalogEnabled: boolean;
  accessRequestsEnabled: boolean;
  policySyncEnabled: boolean;
  auditLogSyncEnabled: boolean;
};

const Toggle = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) => (
  <div className="border-border-default bg-bg-app flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
    <div>
      <div className="text-text-secondary text-xs font-medium">{label}</div>
      <div className="text-text-muted mt-1 text-[10px]">{description}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-4 w-7 rounded-full transition-colors ${checked ? "bg-badge-success-bg" : "bg-bg-active"}`}
    >
      <span
        className={`block h-3 w-3 rounded-full transition-transform ${checked ? "bg-badge-success-text translate-x-3.5" : "bg-text-subtle translate-x-0.5"}`}
      />
    </button>
  </div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-text-secondary mb-1 block text-[11px]">
      {label}
    </label>
    {children}
  </div>
);

export const DesktopApiSettingsSection = () => {
  const utils = api.useUtils();
  const settingsQuery = api.desktopApiSettings.get.useQuery();
  const updateMutation = api.desktopApiSettings.update.useMutation({
    onSuccess: async () => {
      await utils.desktopApiSettings.get.invalidate();
      setSavedMessage("保存しました");
    },
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsFormState>({
    organizationName: "",
    organizationSlug: "",
    catalogEnabled: false,
    accessRequestsEnabled: false,
    policySyncEnabled: false,
    auditLogSyncEnabled: true,
  });

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setForm({
      organizationName: data.organizationName ?? "",
      organizationSlug: data.organizationSlug ?? "",
      catalogEnabled: data.catalogEnabled,
      accessRequestsEnabled: data.accessRequestsEnabled,
      policySyncEnabled: data.policySyncEnabled,
      auditLogSyncEnabled: data.auditLogSyncEnabled,
    });
  }, [settingsQuery.data]);

  const save = (): void => {
    setSavedMessage(null);
    updateMutation.mutate({
      organizationName: form.organizationName.trim() || null,
      organizationSlug: form.organizationSlug.trim() || null,
      catalogEnabled: form.catalogEnabled,
      accessRequestsEnabled: form.accessRequestsEnabled,
      policySyncEnabled: form.policySyncEnabled,
      auditLogSyncEnabled: form.auditLogSyncEnabled,
    });
  };

  return (
    <div className="border-border-default bg-bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-text-primary text-sm font-semibold">
            Desktop API
          </h2>
          <p className="text-text-secondary mt-1 text-xs">
            Desktop のログイン直後に配布する組織プロファイルと機能フラグを管理
          </p>
        </div>
        {settingsQuery.isLoading && (
          <span className="text-text-muted text-[10px]">読み込み中</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="組織名">
          <input
            type="text"
            value={form.organizationName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                organizationName: e.target.value,
              }))
            }
            placeholder="Rayven株式会社"
            className={inputCls}
          />
        </Field>
        <Field label="組織slug">
          <input
            type="text"
            value={form.organizationSlug}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                organizationSlug: e.target.value,
              }))
            }
            placeholder="rayven"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Toggle
          checked={form.catalogEnabled}
          onChange={(catalogEnabled) =>
            setForm((prev) => ({ ...prev, catalogEnabled }))
          }
          label="カタログ配布"
          description="Desktop のカタログ UI を組織モードで有効化"
        />
        <Toggle
          checked={form.accessRequestsEnabled}
          onChange={(accessRequestsEnabled) =>
            setForm((prev) => ({ ...prev, accessRequestsEnabled }))
          }
          label="利用申請"
          description="Desktop からのアクセス申請導線を有効化"
        />
        <Toggle
          checked={form.policySyncEnabled}
          onChange={(policySyncEnabled) =>
            setForm((prev) => ({ ...prev, policySyncEnabled }))
          }
          label="ポリシー同期"
          description="policyVersion を使った差分同期を有効化"
        />
        <Toggle
          checked={form.auditLogSyncEnabled}
          onChange={(auditLogSyncEnabled) =>
            setForm((prev) => ({ ...prev, auditLogSyncEnabled }))
          }
          label="監査ログ同期"
          description="Desktop から Manager への監査ログ送信を許可"
        />
      </div>

      {updateMutation.error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {updateMutation.error.message}
        </p>
      )}
      {savedMessage && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {savedMessage}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={updateMutation.isPending}
          className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMutation.isPending ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
};
