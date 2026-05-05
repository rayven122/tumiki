"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ALLOWED_OBJECT_STORAGE_IMAGE_TYPES,
  MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES,
} from "~/lib/object-storage/constants";
import { api } from "~/trpc/react";
import { Field } from "./Field";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";
const maxLogoFileSizeKb = MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES / 1024;

type SettingsFormState = {
  organizationName: string;
  organizationLogoUrl: string;
};

export const DesktopApiSettingsSection = (): JSX.Element => {
  const utils = api.useUtils();
  const settingsQuery = api.desktopApiSettings.get.useQuery();
  const objectStorageQuery = api.objectStorageSettings.get.useQuery();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const savedMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [form, setForm] = useState<SettingsFormState>({
    organizationName: "",
    organizationLogoUrl: "",
  });
  const formRef = useRef(form);
  const updateMutation = api.desktopApiSettings.update.useMutation({
    onSuccess: async () => {
      await utils.desktopApiSettings.get.invalidate();
      if (savedMessageTimerRef.current) {
        clearTimeout(savedMessageTimerRef.current);
      }
      setSavedMessage("保存しました");
      savedMessageTimerRef.current = setTimeout(() => {
        setSavedMessage(null);
        savedMessageTimerRef.current = null;
      }, 3000);
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
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setForm({
      organizationName: data.organizationName ?? "",
      organizationLogoUrl: data.organizationLogoUrl ?? "",
    });
  }, [settingsQuery.data]);

  const save = (): void => {
    setSavedMessage(null);
    updateMutation.mutate({
      organizationName: form.organizationName,
      organizationLogoUrl: form.organizationLogoUrl,
    });
  };

  const saveForm = (nextForm: SettingsFormState): void => {
    setSavedMessage(null);
    setForm(nextForm);
    updateMutation.mutate({
      organizationName: nextForm.organizationName,
      organizationLogoUrl: nextForm.organizationLogoUrl,
    });
  };

  const handleLogoUpload = async (file: File | undefined): Promise<void> => {
    setLogoError(null);
    if (!file) return;
    if (!objectStorageQuery.data?.isConfigured) {
      setLogoError(
        "画像アップロードにはS3互換ストレージ設定が必要です。先にオブジェクトストレージ設定を保存してください。",
      );
      return;
    }
    if (
      !ALLOWED_OBJECT_STORAGE_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_OBJECT_STORAGE_IMAGE_TYPES)[number],
      )
    ) {
      setLogoError("PNG / JPG / WebP の画像ファイルを選択してください");
      return;
    }
    if (file.size > MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES) {
      setLogoError(`ロゴ画像は${maxLogoFileSizeKb}KB以下にしてください`);
      return;
    }

    setIsUploadingLogo(true);
    try {
      const uploadForm = new FormData();
      uploadForm.set("file", file);
      uploadForm.set("purpose", "org-logo");

      const response = await fetch("/api/admin/object-storage/upload", {
        method: "POST",
        body: uploadForm,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        setLogoError(result.error ?? "ロゴ画像のアップロードに失敗しました");
        return;
      }

      const organizationLogoUrl = result.url;
      const nextForm = { ...formRef.current, organizationLogoUrl };
      saveForm(nextForm);
    } catch {
      setLogoError("ロゴ画像のアップロードに失敗しました");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="border-border-default bg-bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-text-primary text-sm font-semibold">組織情報</h2>
          <p className="text-text-secondary mt-1 text-xs">
            Desktop のサイドバーに表示する組織プロファイルを管理
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
        <Field label="組織ロゴ">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isUploadingLogo}
              onChange={(e) => {
                void handleLogoUpload(e.currentTarget.files?.[0]);
              }}
              className={inputCls}
            />
            <div className="border-border-default bg-bg-app flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
              {form.organizationLogoUrl ? (
                <img
                  src={form.organizationLogoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-text-subtle text-[10px]">Logo</span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-text-muted text-[10px]">
              {isUploadingLogo
                ? "アップロード中..."
                : `PNG / JPG / WebP、${maxLogoFileSizeKb}KBまで`}
            </p>
            {form.organizationLogoUrl && (
              <button
                type="button"
                onClick={() => {
                  saveForm({ ...formRef.current, organizationLogoUrl: "" });
                }}
                className="text-text-secondary hover:text-text-primary text-[10px] transition-colors"
              >
                ロゴを削除
              </button>
            )}
          </div>
          {logoError && (
            <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {logoError}
            </p>
          )}
        </Field>
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
          disabled={
            updateMutation.isPending ||
            isUploadingLogo ||
            Boolean(settingsQuery.error)
          }
          className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateMutation.isPending ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
};
