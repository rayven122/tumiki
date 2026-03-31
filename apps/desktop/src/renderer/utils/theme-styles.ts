import type { CSSProperties } from "react";

/** ステータスバッジの設定を返す */
export const statusBadge = (
  status: string,
): { bg: string; text: string; label: string } => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    success: {
      bg: "var(--badge-success-bg)",
      text: "var(--badge-success-text)",
      label: "成功",
    },
    timeout: {
      bg: "var(--badge-warn-bg)",
      text: "var(--badge-warn-text)",
      label: "タイムアウト",
    },
    blocked: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "ブロック",
    },
    error: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "エラー",
    },
    pending: {
      bg: "var(--badge-warn-bg)",
      text: "var(--badge-warn-text)",
      label: "審査中",
    },
    approved: {
      bg: "var(--badge-success-bg)",
      text: "var(--badge-success-text)",
      label: "承認済み",
    },
    rejected: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "却下",
    },
  };
  return (
    config[status] ?? {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "不明",
    }
  );
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
