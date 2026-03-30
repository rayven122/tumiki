/** ダッシュボード（一般ユーザー）用データ定義 */

/* ===== コネクタ別アクセス推移データ ===== */

const CONNECTOR_24H = [
  { time: "00:00", slack: 2, github: 0, notion: 1, figma: 0, sentry: 0 },
  { time: "04:00", slack: 0, github: 0, notion: 0, figma: 0, sentry: 0 },
  { time: "08:00", slack: 5, github: 3, notion: 2, figma: 1, sentry: 2 },
  { time: "10:00", slack: 8, github: 6, notion: 4, figma: 2, sentry: 3 },
  { time: "12:00", slack: 4, github: 2, notion: 3, figma: 0, sentry: 1 },
  { time: "14:00", slack: 7, github: 5, notion: 2, figma: 3, sentry: 4 },
  { time: "16:00", slack: 6, github: 8, notion: 3, figma: 1, sentry: 2 },
  { time: "18:00", slack: 3, github: 4, notion: 1, figma: 0, sentry: 1 },
  { time: "20:00", slack: 1, github: 1, notion: 0, figma: 0, sentry: 0 },
  { time: "22:00", slack: 0, github: 0, notion: 0, figma: 0, sentry: 0 },
];

const CONNECTOR_7D = [
  { time: "Mon", slack: 32, github: 28, notion: 18, figma: 8, sentry: 14 },
  { time: "Tue", slack: 38, github: 35, notion: 22, figma: 12, sentry: 16 },
  { time: "Wed", slack: 42, github: 31, notion: 20, figma: 10, sentry: 18 },
  { time: "Thu", slack: 35, github: 40, notion: 25, figma: 6, sentry: 12 },
  { time: "Fri", slack: 45, github: 38, notion: 15, figma: 14, sentry: 20 },
  { time: "Sat", slack: 5, github: 2, notion: 3, figma: 0, sentry: 0 },
  { time: "Sun", slack: 2, github: 0, notion: 1, figma: 0, sentry: 0 },
];

const CONNECTOR_30D = [
  { time: "W1", slack: 180, github: 145, notion: 95, figma: 42, sentry: 68 },
  { time: "W2", slack: 210, github: 168, notion: 102, figma: 55, sentry: 78 },
  { time: "W3", slack: 195, github: 178, notion: 88, figma: 48, sentry: 72 },
  { time: "W4", slack: 225, github: 192, notion: 110, figma: 60, sentry: 85 },
];

export const CONNECTOR_MAP = {
  "24h": CONNECTOR_24H,
  "7d": CONNECTOR_7D,
  "30d": CONNECTOR_30D,
} as const;

/* ===== コネクタ凡例 ===== */

export const CONNECTOR_LEGENDS = [
  { label: "Slack", key: "slack", color: "#E01E5A" },
  { label: "GitHub", key: "github", color: "#8b949e" },
  { label: "Notion", key: "notion", color: "#787878" },
  { label: "Figma", key: "figma", color: "#A259FF" },
  { label: "Sentry", key: "sentry", color: "#362D59" },
] as const;

/* ===== AIクライアント構成比 ===== */

export const AI_PIE = [
  { name: "Cursor", value: 62, color: "#fff" },
  { name: "ChatGPT", value: 28, color: "#10a37f" },
  { name: "Claude", value: 10, color: "#DA704E" },
];

/* ===== AIクライアントロゴ ===== */

export const AI_CLIENTS = [
  {
    name: "Cursor",
    dark: "/logos/ai-clients/cursor.webp",
    light: "/logos/ai-clients/cursor.svg",
  },
  {
    name: "ChatGPT",
    dark: "/logos/ai-clients/chatgpt.webp",
    light: "/logos/ai-clients/chatgpt.svg",
  },
  {
    name: "Claude",
    dark: "/logos/ai-clients/claude.webp",
    light: "/logos/ai-clients/claude.svg",
  },
];

/* ===== コネクタ（カード表示用） ===== */

export const CONNECTORS = [
  {
    name: "Slack",
    dark: "/logos/services/slack.webp",
    light: "/logos/services/slack.webp",
    status: "active",
  },
  {
    name: "GitHub",
    dark: "/logos/services/github_white.svg",
    light: "/logos/services/github_black.svg",
    status: "active",
  },
  {
    name: "Notion",
    dark: "/logos/services/notion.webp",
    light: "/logos/services/notion.webp",
    status: "active",
  },
  {
    name: "Figma",
    dark: "/logos/services/figma.webp",
    light: "/logos/services/figma.webp",
    status: "active",
  },
  {
    name: "Sentry",
    dark: "/logos/services/sentry.webp",
    light: "/logos/services/sentry.webp",
    status: "active",
  },
  {
    name: "Google Drive",
    dark: "/logos/services/google-drive.svg",
    light: "/logos/services/google-drive.svg",
    status: "active",
  },
] as const;

/* ===== 期間別KPI ===== */

export const PERIOD_STATS = {
  "24h": {
    requests: "47",
    requestsSub: "+5 前日比",
    blocks: "1",
    blocksSub: "2.1%",
    successRate: "97.9%",
    successSub: "前日比 +0.3%",
    connectors: "5",
    connectorsSub: "1 遅延中",
  },
  "7d": {
    requests: "312",
    requestsSub: "+18% 前週比",
    blocks: "3",
    blocksSub: "1.0%",
    successRate: "99.0%",
    successSub: "前週比 +0.2%",
    connectors: "5",
    connectorsSub: "1 遅延中",
  },
  "30d": {
    requests: "1,247",
    requestsSub: "+22% 前月比",
    blocks: "8",
    blocksSub: "0.6%",
    successRate: "99.4%",
    successSub: "前月比 +0.5%",
    connectors: "5",
    connectorsSub: "全稼働",
  },
} as const;

/* ===== 期間選択肢 ===== */

export type Period = "24h" | "7d" | "30d";
export const PERIODS: readonly Period[] = ["24h", "7d", "30d"] as const;
