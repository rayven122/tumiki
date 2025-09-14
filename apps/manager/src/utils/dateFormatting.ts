import { formatDistanceToNow, format, type Locale } from "date-fns";
import { ja } from "date-fns/locale";

type DateFormattingOptions = {
  showAbsolute?: boolean;
  locale?: Locale;
};

export const formatNotificationTime = (
  timestamp: Date,
  options: DateFormattingOptions = {},
): string => {
  const { showAbsolute = false, locale = ja } = options;

  if (showAbsolute) {
    return format(timestamp, "yyyy年MM月dd日 HH:mm:ss", { locale });
  }

  return formatDistanceToNow(timestamp, {
    addSuffix: true,
    locale,
  });
};

export const createTimeFormatter = (showAbsolute: boolean) => {
  return (timestamp: Date) =>
    formatNotificationTime(timestamp, { showAbsolute });
};
