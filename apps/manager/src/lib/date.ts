import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * ApiKeysTabと同じ形式で日付をフォーマットする（date-fnsを使用）
 * 「YYYY/MM/DD HH:MM」の形式（日本語ロケール、2桁表示）
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "yyyy/MM/dd HH:mm", { locale: ja });
};
