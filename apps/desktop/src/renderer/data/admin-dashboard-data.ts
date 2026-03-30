/** 管理者ダッシュボード用データ定義 */

/* ===== 期間別トラフィックデータ ===== */

const TRAFFIC_24H = [
  {
    time: "00:00",
    cursor: 180,
    chatgpt: 100,
    claude: 420,
    copilot: 90,
    cline: 680,
    ag: 60,
  },
  {
    time: "04:00",
    cursor: 80,
    chatgpt: 40,
    claude: 350,
    copilot: 50,
    cline: 920,
    ag: 30,
  },
  {
    time: "08:00",
    cursor: 3200,
    chatgpt: 800,
    claude: 1100,
    copilot: 2400,
    cline: 320,
    ag: 180,
  },
  {
    time: "10:00",
    cursor: 4800,
    chatgpt: 1600,
    claude: 1300,
    copilot: 3600,
    cline: 280,
    ag: 240,
  },
  {
    time: "12:00",
    cursor: 3100,
    chatgpt: 2400,
    claude: 1200,
    copilot: 1800,
    cline: 350,
    ag: 320,
  },
  {
    time: "14:00",
    cursor: 2600,
    chatgpt: 3800,
    claude: 1400,
    copilot: 2200,
    cline: 420,
    ag: 480,
  },
  {
    time: "16:00",
    cursor: 2900,
    chatgpt: 4200,
    claude: 1350,
    copilot: 2000,
    cline: 580,
    ag: 720,
  },
  {
    time: "18:00",
    cursor: 1800,
    chatgpt: 2800,
    claude: 1100,
    copilot: 1200,
    cline: 900,
    ag: 980,
  },
  {
    time: "20:00",
    cursor: 900,
    chatgpt: 1200,
    claude: 980,
    copilot: 600,
    cline: 1800,
    ag: 540,
  },
  {
    time: "22:00",
    cursor: 400,
    chatgpt: 600,
    claude: 750,
    copilot: 300,
    cline: 2400,
    ag: 280,
  },
];

const TRAFFIC_7D = [
  {
    time: "Mon",
    cursor: 18200,
    chatgpt: 14800,
    claude: 9800,
    copilot: 11200,
    cline: 6400,
    ag: 3200,
  },
  {
    time: "Tue",
    cursor: 21400,
    chatgpt: 16200,
    claude: 10500,
    copilot: 12800,
    cline: 7100,
    ag: 3800,
  },
  {
    time: "Wed",
    cursor: 24600,
    chatgpt: 19800,
    claude: 11200,
    copilot: 14200,
    cline: 5800,
    ag: 4200,
  },
  {
    time: "Thu",
    cursor: 22100,
    chatgpt: 21400,
    claude: 10800,
    copilot: 13600,
    cline: 8200,
    ag: 3600,
  },
  {
    time: "Fri",
    cursor: 26800,
    chatgpt: 18600,
    claude: 12400,
    copilot: 15800,
    cline: 9400,
    ag: 5100,
  },
  {
    time: "Sat",
    cursor: 8400,
    chatgpt: 12200,
    claude: 7600,
    copilot: 4200,
    cline: 11800,
    ag: 6800,
  },
  {
    time: "Sun",
    cursor: 6200,
    chatgpt: 9800,
    claude: 6400,
    copilot: 3100,
    cline: 13200,
    ag: 7200,
  },
];

const TRAFFIC_30D = [
  {
    time: "W1",
    cursor: 82000,
    chatgpt: 56000,
    claude: 42000,
    copilot: 48000,
    cline: 28000,
    ag: 14000,
  },
  {
    time: "W2",
    cursor: 94000,
    chatgpt: 68000,
    claude: 48000,
    copilot: 52000,
    cline: 32000,
    ag: 18000,
  },
  {
    time: "W3",
    cursor: 108000,
    chatgpt: 82000,
    claude: 54000,
    copilot: 58000,
    cline: 38000,
    ag: 22000,
  },
  {
    time: "W4",
    cursor: 124000,
    chatgpt: 98000,
    claude: 62000,
    copilot: 64000,
    cline: 44000,
    ag: 28000,
  },
];

export const TRAFFIC_MAP = {
  "24h": TRAFFIC_24H,
  "7d": TRAFFIC_7D,
  "30d": TRAFFIC_30D,
} as const;

/* ===== AIクライアント構成比 ===== */

export const AI_PIE = [
  { name: "Cursor", value: 30, color: "#fff" },
  { name: "ChatGPT", value: 22, color: "#10a37f" },
  { name: "Claude", value: 18, color: "#DA704E" },
  { name: "Copilot", value: 14, color: "#2b88d8" },
  { name: "Cline", value: 10, color: "#71717a" },
  { name: "AG", value: 6, color: "#a855f7" },
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
  {
    name: "Copilot",
    dark: "/logos/ai-clients/copilot.webp",
    light: "/logos/ai-clients/copilot.svg",
  },
  {
    name: "Cline",
    dark: "/logos/ai-clients/cline.webp",
    light: "/logos/ai-clients/cline.svg",
  },
  {
    name: "Antigravity",
    dark: "/logos/ai-clients/antigravity.webp",
    light: "/logos/ai-clients/antigravity.svg",
  },
];

/* ===== 接続先サービス ===== */

export const SERVICES = [
  {
    name: "GitHub",
    dark: "/logos/services/github_white.svg",
    light: "/logos/services/github_black.svg",
    status: "active",
    requests: 3420,
  },
  {
    name: "Notion",
    dark: "/logos/services/notion.webp",
    light: "/logos/services/notion.webp",
    status: "active",
    requests: 2810,
  },
  {
    name: "Figma",
    dark: "/logos/services/figma.webp",
    light: "/logos/services/figma.webp",
    status: "active",
    requests: 1960,
  },
  {
    name: "Google Drive",
    dark: "/logos/services/google-drive.svg",
    light: "/logos/services/google-drive.svg",
    status: "active",
    requests: 1340,
  },
  {
    name: "Slack",
    dark: "/logos/services/slack.webp",
    light: "/logos/services/slack.webp",
    status: "active",
    requests: 1120,
  },
  {
    name: "PostgreSQL",
    dark: "/logos/services/postgresql.webp",
    light: "/logos/services/postgresql.webp",
    status: "active",
    requests: 890,
  },
  {
    name: "Sentry",
    dark: "/logos/services/sentry.webp",
    light: "/logos/services/sentry.webp",
    status: "idle",
    requests: 340,
  },
  {
    name: "Microsoft Teams",
    dark: "/logos/services/microsoft-teams.webp",
    light: "/logos/services/microsoft-teams.webp",
    status: "active",
    requests: 780,
  },
  {
    name: "OneDrive",
    dark: "/logos/services/one-drive.webp",
    light: "/logos/services/one-drive.webp",
    status: "active",
    requests: 620,
  },
  {
    name: "Playwright",
    dark: "/logos/services/playwright.webp",
    light: "/logos/services/playwright.webp",
    status: "idle",
    requests: 210,
  },
] as const;

/* ===== 期間別KPIデータ ===== */

export const PERIOD_STATS = {
  "24h": {
    requests: "12,847",
    requestsSub: "+12.4% 前日比",
    blocks: "47",
    blocksSub: "0.37%",
    users: "156",
    usersSub: "+3 今日",
  },
  "7d": {
    requests: "89,420",
    requestsSub: "+8.2% 前週比",
    blocks: "312",
    blocksSub: "0.35%",
    users: "284",
    usersSub: "+18 今週",
  },
  "30d": {
    requests: "342,800",
    requestsSub: "+22.6% 前月比",
    blocks: "1,247",
    blocksSub: "0.36%",
    users: "412",
    usersSub: "+67 今月",
  },
} as const;

/* ===== チャート凡例定義 ===== */

export const CHART_LEGENDS = [
  { label: "Cursor", key: "cursor", color: "#fff" },
  { label: "ChatGPT", key: "chatgpt", color: "#10a37f" },
  { label: "Claude", key: "claude", color: "#DA704E" },
  { label: "Copilot", key: "copilot", color: "#2b88d8" },
  { label: "Cline", key: "cline", color: "#71717a" },
  { label: "AG", key: "ag", color: "#a855f7" },
] as const;

/* ===== 期間選択肢 ===== */

export type Period = "24h" | "7d" | "30d";
export const PERIODS: readonly Period[] = ["24h", "7d", "30d"] as const;

/* ===== サービスの最大リクエスト数 ===== */

export const MAX_SERVICE_REQUESTS = Math.max(
  ...SERVICES.map((s) => s.requests),
);
