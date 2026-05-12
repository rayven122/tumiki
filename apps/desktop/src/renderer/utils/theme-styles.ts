type BadgeVariant = "success" | "warn" | "error";

type BadgeConfig = {
  className: string;
  label: string;
};

const BADGE_VARIANT: Record<BadgeVariant, Pick<BadgeConfig, "className">> = {
  success: {
    className:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  warn: {
    className:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  },
  error: {
    className: "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400",
  },
};

const BADGE_LABEL: Record<string, { variant: BadgeVariant; label: string }> = {
  success: { variant: "success", label: "成功" },
  timeout: { variant: "warn", label: "タイムアウト" },
  blocked: { variant: "error", label: "ブロック" },
  error: { variant: "error", label: "エラー" },
  pending: { variant: "warn", label: "審査中" },
  approved: { variant: "success", label: "承認済み" },
  rejected: { variant: "error", label: "却下" },
};

/** ステータスバッジの設定を返す */
export const statusBadge = (status: string): BadgeConfig => {
  const entry = BADGE_LABEL[status];
  if (!entry) {
    return { ...BADGE_VARIANT.error, label: "不明" };
  }
  return { ...BADGE_VARIANT[entry.variant], label: entry.label };
};

/** エラー系ステータスかどうか */
export const isErrorRow = (status: string): boolean =>
  status === "blocked" || status === "error";

/** カードの共通 className */
export const cardStyle =
  "border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900";

/** セレクトの共通 className */
export const selectStyle =
  "border border-gray-200 bg-white text-gray-600 dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400";
