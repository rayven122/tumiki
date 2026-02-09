// スケジュールタイプ
export type ScheduleType = "fixed" | "interval";

// 定時実行の頻度オプション
export const FREQUENCY_OPTIONS = [
  { label: "毎日", value: "daily", cron: "* * *" },
  { label: "平日（月〜金）", value: "weekdays", cron: "* * 1-5" },
  { label: "土日", value: "weekends", cron: "* * 0,6" },
  { label: "毎週月曜", value: "monday", cron: "* * 1" },
  { label: "毎週金曜", value: "friday", cron: "* * 5" },
  { label: "毎月1日", value: "monthly", cron: "1 * *" },
] as const;

export type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

// インターバル実行のオプション
export const INTERVAL_OPTIONS = [
  { label: "15分ごと", value: "15min", cron: "*/15 * * * *" },
  { label: "30分ごと", value: "30min", cron: "*/30 * * * *" },
  { label: "1時間ごと", value: "1hour", cron: "0 * * * *" },
  { label: "2時間ごと", value: "2hour", cron: "0 */2 * * *" },
  { label: "3時間ごと", value: "3hour", cron: "0 */3 * * *" },
  { label: "6時間ごと", value: "6hour", cron: "0 */6 * * *" },
  { label: "12時間ごと", value: "12hour", cron: "0 */12 * * *" },
] as const;

export type IntervalValue = (typeof INTERVAL_OPTIONS)[number]["value"];

// 時間オプション
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, "0")}時`,
  value: i.toString(),
}));

// 分オプション
export const MINUTE_OPTIONS = [
  { label: "00分", value: "0" },
  { label: "15分", value: "15" },
  { label: "30分", value: "30" },
  { label: "45分", value: "45" },
];

// 時刻フォーマット
export const padTime = (value: string | number): string =>
  String(value).padStart(2, "0");

export const formatTime = (
  hour: string | number,
  minute: string | number,
): string => `${padTime(hour)}:${padTime(minute)}`;

// クライアントタイムゾーン取得
export const getClientTimezone = (): string => {
  if (typeof window === "undefined") return "Asia/Tokyo";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Tokyo";
  }
};

// Cron式をパース
export type ParsedCron = {
  type: ScheduleType;
  frequency?: FrequencyValue;
  interval?: IntervalValue;
  hour: string;
  minute: string;
};

export const parseCronExpression = (cron: string): ParsedCron => {
  // インターバル形式をチェック
  const intervalMatch = INTERVAL_OPTIONS.find((opt) => opt.cron === cron);
  if (intervalMatch) {
    return {
      type: "interval",
      interval: intervalMatch.value,
      hour: "9",
      minute: "0",
    };
  }

  // 定時実行形式をパース
  const parts = cron.split(" ");
  if (parts.length !== 5) {
    return { type: "fixed", frequency: "daily", hour: "9", minute: "0" };
  }

  const [minute, hour, day, , dayOfWeek] = parts;
  const cronSuffix = `${day} * ${dayOfWeek}`;

  const matchedOption = FREQUENCY_OPTIONS.find(
    (opt) => opt.cron === cronSuffix,
  );

  return {
    type: "fixed",
    frequency: matchedOption?.value ?? "daily",
    hour: hour ?? "9",
    minute: minute ?? "0",
  };
};

// 定時実行のCron式を生成
export const buildFixedCronExpression = (
  frequency: FrequencyValue,
  hour: string,
  minute: string,
): string => {
  const frequencyOption = FREQUENCY_OPTIONS.find((f) => f.value === frequency);
  const cronSuffix = frequencyOption?.cron ?? "* * *";
  return `${minute} ${hour} ${cronSuffix}`;
};

// インターバル実行のCron式を生成
export const buildIntervalCronExpression = (
  interval: IntervalValue,
): string => {
  const intervalOption = INTERVAL_OPTIONS.find((i) => i.value === interval);
  return intervalOption?.cron ?? "*/15 * * * *";
};

// 頻度ラベル取得
export const getFrequencyLabel = (frequency: FrequencyValue): string =>
  FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? "毎日";

// インターバルラベル取得
export const getIntervalLabel = (interval: IntervalValue): string =>
  INTERVAL_OPTIONS.find((i) => i.value === interval)?.label ?? "15分ごと";

// 曜日パターンと日本語ラベルのマッピング
const DAY_PATTERN_LABELS: Record<string, string> = {
  "1-5": "平日",
  "0,6": "土日",
  "1": "毎週月曜",
  "5": "毎週金曜",
};

// Cron式を日本語の説明に変換
export const cronToJapanese = (cron: string): string => {
  // インターバル形式（定義済みオプション）
  const intervalMatch = INTERVAL_OPTIONS.find((opt) => opt.cron === cron);
  if (intervalMatch) {
    return `${intervalMatch.label}に実行`;
  }

  // インターバル形式（カスタム分単位）
  const customMinuteMatch = /^\*\/(\d+) \* \* \* \*$/.exec(cron);
  if (customMinuteMatch) {
    return `${customMinuteMatch[1]}分ごとに実行`;
  }

  // インターバル形式（時間単位）
  const hourlyMatch = /^0 \*\/(\d+) \* \* \*$/.exec(cron);
  if (hourlyMatch) {
    return `${hourlyMatch[1]}時間ごとに実行`;
  }

  // 毎時0分
  if (cron === "0 * * * *") {
    return "1時間ごとに実行";
  }

  // 定時実行形式をパース
  const parts = cron.split(" ");
  if (parts.length !== 5) {
    return cron;
  }

  const [minute, hour, day, , dayOfWeek] = parts;
  const time = formatTime(hour ?? "0", minute ?? "0");

  // 毎月特定日
  if (day === "1" && dayOfWeek === "*") {
    return `毎月1日 ${time} に実行`;
  }

  // 毎日
  if (dayOfWeek === "*" && day === "*") {
    return `毎日 ${time} に実行`;
  }

  // 曜日パターン
  const dayLabel = dayOfWeek ? DAY_PATTERN_LABELS[dayOfWeek] : undefined;
  if (dayLabel && day === "*") {
    return `${dayLabel} ${time} に実行`;
  }

  return cron;
};

// JSTプレビュー取得
export const getJstPreview = (
  hour: string,
  minute: string,
  clientTimezone: string,
): string => {
  const fallback = formatTime(hour, minute);
  if (clientTimezone === "Asia/Tokyo") {
    return fallback;
  }

  try {
    const now = new Date();
    now.setHours(Number(hour), Number(minute), 0, 0);

    return now.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return fallback;
  }
};
