"use client";

import { api } from "~/trpc/react";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <label className="text-text-secondary mb-1 block text-[11px]">
      {label}
    </label>
    <input type="text" value={value ?? ""} readOnly className={inputCls} />
  </div>
);

const SsoConfigSection = () => {
  const { data, isLoading, isError } = api.sso.getConfig.useQuery();

  if (isLoading) {
    return <div className="text-text-muted text-xs">読み込み中…</div>;
  }

  if (isError) {
    return <div className="text-xs text-red-400">設定の取得に失敗しました</div>;
  }

  return (
    <div className="space-y-4">
      <Field label="Issuer URL" value={data?.issuer ?? null} />
      <Field
        label="Client ID（管理サーバー用）"
        value={data?.clientId ?? null}
      />
      <p className="text-text-muted text-[10px]">
        変更するには環境変数を更新して再起動してください
      </p>
    </div>
  );
};

export default SsoConfigSection;
