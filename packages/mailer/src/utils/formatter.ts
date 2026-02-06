export function formatDateJa(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

/**
 * RFC 5322形式のFromアドレスを生成
 *
 * @param email - メールアドレス
 * @param name - 表示名（省略可能）
 * @returns RFC 5322形式のアドレス文字列
 */
export const formatFromAddress = (email: string, name?: string): string => {
  if (!name || name.trim() === "") {
    return email;
  }

  const trimmedName = name.trim();
  // RFC 5322で特殊文字として扱われる文字をチェック
  const specialChars = /[(),.:;<>@[\]\\"\s]/;

  if (specialChars.test(trimmedName)) {
    // 特殊文字が含まれる場合はダブルクォートで囲む
    // 名前内のダブルクォートはエスケープ
    const escapedName = trimmedName.replace(/"/g, '\\"');
    return `"${escapedName}" <${email}>`;
  }

  return `${trimmedName} <${email}>`;
};
