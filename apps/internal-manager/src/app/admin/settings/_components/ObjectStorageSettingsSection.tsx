"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Field } from "./Field";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

type StorageFormState = {
  endpoint: string;
  region: string;
  bucket: string;
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export const ObjectStorageSettingsSection = (): JSX.Element => {
  const utils = api.useUtils();
  const settingsQuery = api.objectStorageSettings.get.useQuery();
  const environmentConfigured = Boolean(
    settingsQuery.data?.environmentConfigured,
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const savedMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [form, setForm] = useState<StorageFormState>({
    endpoint: "",
    region: "auto",
    bucket: "",
    publicBaseUrl: "",
    accessKeyId: "",
    secretAccessKey: "",
    forcePathStyle: true,
  });

  const updateMutation = api.objectStorageSettings.update.useMutation({
    onSuccess: async () => {
      await utils.objectStorageSettings.get.invalidate();
      if (savedMessageTimerRef.current) {
        clearTimeout(savedMessageTimerRef.current);
      }
      setSavedMessage("保存しました");
      savedMessageTimerRef.current = setTimeout(() => {
        setSavedMessage(null);
        savedMessageTimerRef.current = null;
      }, 3000);
      setForm((prev) => ({ ...prev, secretAccessKey: "" }));
    },
  });

  useEffect(() => {
    return () => {
      if (savedMessageTimerRef.current) {
        clearTimeout(savedMessageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setForm((prev) => ({
      endpoint: data.endpoint ?? "",
      region: data.region ?? "auto",
      bucket: data.bucket ?? "",
      publicBaseUrl: data.publicBaseUrl ?? "",
      accessKeyId: data.accessKeyId ?? "",
      secretAccessKey: prev.secretAccessKey,
      forcePathStyle: data.forcePathStyle,
    }));
  }, [settingsQuery.data]);

  const save = (): void => {
    setSavedMessage(null);
    updateMutation.mutate({
      endpoint: form.endpoint,
      region: form.region,
      bucket: form.bucket,
      publicBaseUrl: form.publicBaseUrl,
      accessKeyId: form.accessKeyId,
      secretAccessKey: form.secretAccessKey,
      forcePathStyle: form.forcePathStyle,
    });
  };

  return (
    <div className="border-border-default bg-bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-text-primary text-sm font-semibold">
            オブジェクトストレージ
          </h2>
          <p className="text-text-secondary mt-1 text-xs">
            組織ロゴ、カスタムコネクタ画像、ログエクスポートの保存先を管理
          </p>
        </div>
        {settingsQuery.isLoading && (
          <span className="text-text-muted text-[10px]">読み込み中</span>
        )}
        {settingsQuery.error && (
          <span className="text-xs text-red-400">
            設定の読み込みに失敗しました
          </span>
        )}
      </div>

      {settingsQuery.data?.environmentConfigured && (
        <p className="mb-4 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          環境変数のストレージ設定が有効です。実際のアップロードでは環境変数が優先されます。
        </p>
      )}
      {settingsQuery.data && !settingsQuery.data.isConfigured && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          未設定です。画像アップロード機能を使うには、この設定を保存してください。
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Endpoint">
          <input
            type="url"
            value={form.endpoint}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, endpoint: e.target.value }))
            }
            placeholder="http://localhost:9000"
            className={inputCls}
          />
        </Field>
        <Field label="Region">
          <input
            type="text"
            value={form.region}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, region: e.target.value }))
            }
            placeholder="auto"
            className={inputCls}
          />
        </Field>
        <Field label="Bucket">
          <input
            type="text"
            value={form.bucket}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bucket: e.target.value }))
            }
            placeholder="tumiki-assets"
            className={inputCls}
          />
        </Field>
        <Field label="Public Base URL">
          <input
            type="url"
            value={form.publicBaseUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, publicBaseUrl: e.target.value }))
            }
            placeholder="http://localhost:9000/tumiki-assets"
            className={inputCls}
          />
        </Field>
        <Field label="Access Key ID">
          <input
            type="text"
            value={form.accessKeyId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, accessKeyId: e.target.value }))
            }
            placeholder="minioadmin"
            className={inputCls}
          />
        </Field>
        <Field label="Secret Access Key">
          <input
            type="password"
            value={form.secretAccessKey}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                secretAccessKey: e.target.value,
              }))
            }
            placeholder={
              settingsQuery.data?.hasSecretAccessKey
                ? "保存済み。変更時のみ入力"
                : "minioadmin"
            }
            className={inputCls}
          />
        </Field>
      </div>

      <label className="text-text-secondary mt-4 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={form.forcePathStyle}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              forcePathStyle: e.currentTarget.checked,
            }))
          }
          className="accent-emerald-400"
        />
        Path-style access を使う
      </label>

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
          disabled={
            updateMutation.isPending ||
            Boolean(settingsQuery.error) ||
            environmentConfigured
          }
          className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {environmentConfigured
            ? "環境変数が優先されています"
            : updateMutation.isPending
              ? "保存中..."
              : "保存"}
        </button>
      </div>
    </div>
  );
};
