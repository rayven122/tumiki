/**
 * メールアドレスのバリデーション
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * メールアドレスのパース
 * カンマ、セミコロン、改行で区切られたメールアドレスを配列に変換
 */
export const parseEmails = (input: string): string[] => {
  if (!input.trim()) return [];

  const emails = input
    .split(/[,;\n]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  return [...new Set(emails)]; // 重複を削除
};
