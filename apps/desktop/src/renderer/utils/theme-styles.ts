import type { CSSProperties } from "react";

type BadgeVariant = "success" | "warn" | "error";

type BadgeConfig = {
  bg: string;
  text: string;
  className: string;
  label: string;
};

const BADGE_VARIANT: Record<
  BadgeVariant,
  Pick<BadgeConfig, "bg" | "text" | "className">
> = {
  success: {
    bg: "var(--badge-success-bg)",
    text: "var(--badge-success-text)",
    className: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
  },
  warn: {
    bg: "var(--badge-warn-bg)",
    text: "var(--badge-warn-text)",
    className: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)]",
  },
  error: {
    bg: "var(--badge-error-bg)",
    text: "var(--badge-error-text)",
    className: "bg-[var(--badge-error-bg)] text-[var(--badge-error-text)]",
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

/** ステータスバッジの設定を返す（className は Tailwind 任意値、bg/text は style フォールバック用） */
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

/** カードの共通スタイル */
export const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  boxShadow: "var(--shadow-card)",
};

/** セレクトの共通スタイル */
export const selectStyle: CSSProperties = {
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-secondary)",
};

/** テキスト入力の共通スタイル */
export const inputStyle: CSSProperties = {
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-primary)",
};

/** セクション区切りの共通スタイル */
export const sectionBorderStyle: CSSProperties = {
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--border)",
};

/** 認証種別バッジのスタイルを返す */
export const authBadgeStyle = (
  authType: "NONE" | "API_KEY" | "OAuth",
): { backgroundColor: string; color: string } => {
  switch (authType) {
    case "NONE":
      return {
        backgroundColor: "var(--badge-success-bg)",
        color: "var(--badge-success-text)",
      };
    case "API_KEY":
      return {
        backgroundColor: "var(--badge-warn-bg)",
        color: "var(--badge-warn-text)",
      };
    case "OAuth":
      return {
        backgroundColor: "var(--badge-info-bg)",
        color: "var(--badge-info-text)",
      };
  }
};
