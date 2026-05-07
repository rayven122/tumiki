"use client";

import { api } from "~/trpc/react";
import { Field } from "./Field";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary disabled:text-text-muted w-full cursor-not-allowed rounded-lg border px-3 py-2 text-xs opacity-70 outline-none";

const ReadonlyField = ({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) => (
  <Field label={label}>
    <input type="text" value={value ?? ""} disabled className={inputCls} />
  </Field>
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
      {data?.environmentConfigured ? (
        <p className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          {data.source === "jackson"
            ? "Jackson 自動生成の OIDC"
            : "環境変数の OIDC"}
          設定が有効です。現在の値を表示していますが、この画面からは変更できません。
        </p>
      ) : (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          OIDC
          環境変数が未設定です。認証を有効にするには環境変数を設定して再起動してください。
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ReadonlyField label="Issuer URL" value={data?.issuer ?? null} />
        <ReadonlyField
          label="Client ID（管理サーバー用）"
          value={data?.clientId ?? null}
        />
        <ReadonlyField
          label="Client Secret"
          value={data?.hasClientSecret ? "********" : null}
        />
        <ReadonlyField
          label="Desktop Client ID"
          value={data?.desktopClientId ?? null}
        />
      </div>
    </div>
  );
};

export default SsoConfigSection;
