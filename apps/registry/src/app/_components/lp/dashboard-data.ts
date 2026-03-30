/* ===== DashboardMock用データ定義 ===== */

/* 期間別トラフィックデータ */
export type TrafficRow = {
  time: string;
  cursor: number;
  chatgpt: number;
  claude: number;
  copilot: number;
  cline: number;
  ag: number;
};

const TRAFFIC_24H: TrafficRow[] = [
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

const TRAFFIC_7D: TrafficRow[] = [
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

const TRAFFIC_30D: TrafficRow[] = [
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

/* AIクライアント別構成比（ドーナツチャート） */
export type AiPieEntry = { name: string; value: number; color: string };

const AI_PIE_24H: AiPieEntry[] = [
  { name: "Cursor", value: 30, color: "#fff" },
  { name: "ChatGPT", value: 22, color: "#10a37f" },
  { name: "Claude", value: 18, color: "#DA704E" },
  { name: "Copilot", value: 14, color: "#2b88d8" },
  { name: "Cline", value: 10, color: "#71717a" },
  { name: "AG", value: 6, color: "#a855f7" },
];

const AI_PIE_7D: AiPieEntry[] = [
  { name: "Cursor", value: 28, color: "#fff" },
  { name: "ChatGPT", value: 25, color: "#10a37f" },
  { name: "Claude", value: 20, color: "#DA704E" },
  { name: "Copilot", value: 13, color: "#2b88d8" },
  { name: "Cline", value: 9, color: "#71717a" },
  { name: "AG", value: 5, color: "#a855f7" },
];

const AI_PIE_30D: AiPieEntry[] = [
  { name: "Cursor", value: 26, color: "#fff" },
  { name: "ChatGPT", value: 27, color: "#10a37f" },
  { name: "Claude", value: 22, color: "#DA704E" },
  { name: "Copilot", value: 12, color: "#2b88d8" },
  { name: "Cline", value: 8, color: "#71717a" },
  { name: "AG", value: 5, color: "#a855f7" },
];

export const AI_PIE_MAP = {
  "24h": AI_PIE_24H,
  "7d": AI_PIE_7D,
  "30d": AI_PIE_30D,
} as const;

/* 接続先サービス（期間別） */
export type ServiceRow = {
  name: string;
  logo: string;
  invert: boolean;
  status: "active" | "idle";
  requests: number;
};

export const SERVICES_24H: ServiceRow[] = [
  {
    name: "GitHub",
    logo: "/logos/services/github.webp",
    invert: false,
    status: "active",
    requests: 3420,
  },
  {
    name: "Notion",
    logo: "/logos/services/notion.webp",
    invert: false,
    status: "active",
    requests: 2810,
  },
  {
    name: "Figma",
    logo: "/logos/services/figma.webp",
    invert: false,
    status: "active",
    requests: 1960,
  },
  {
    name: "Google Drive",
    logo: "/logos/services/google-drive.svg",
    invert: false,
    status: "active",
    requests: 1340,
  },
  {
    name: "Slack",
    logo: "/logos/services/slack.webp",
    invert: false,
    status: "active",
    requests: 1120,
  },
  {
    name: "PostgreSQL",
    logo: "/logos/services/postgresql.webp",
    invert: false,
    status: "active",
    requests: 890,
  },
  {
    name: "Sentry",
    logo: "/logos/services/sentry.webp",
    invert: false,
    status: "idle",
    requests: 340,
  },
  {
    name: "Microsoft Teams",
    logo: "/logos/services/microsoft-teams.webp",
    invert: false,
    status: "active",
    requests: 780,
  },
  {
    name: "OneDrive",
    logo: "/logos/services/one-drive.webp",
    invert: false,
    status: "active",
    requests: 620,
  },
  {
    name: "Playwright",
    logo: "/logos/services/playwright.webp",
    invert: false,
    status: "idle",
    requests: 210,
  },
];

const SERVICES_7D: ServiceRow[] = [
  {
    name: "GitHub",
    logo: "/logos/services/github.webp",
    invert: false,
    status: "active",
    requests: 21400,
  },
  {
    name: "Notion",
    logo: "/logos/services/notion.webp",
    invert: false,
    status: "active",
    requests: 18200,
  },
  {
    name: "Figma",
    logo: "/logos/services/figma.webp",
    invert: false,
    status: "active",
    requests: 12800,
  },
  {
    name: "Google Drive",
    logo: "/logos/services/google-drive.svg",
    invert: false,
    status: "active",
    requests: 8900,
  },
  {
    name: "Slack",
    logo: "/logos/services/slack.webp",
    invert: false,
    status: "active",
    requests: 7400,
  },
  {
    name: "PostgreSQL",
    logo: "/logos/services/postgresql.webp",
    invert: false,
    status: "active",
    requests: 5800,
  },
  {
    name: "Sentry",
    logo: "/logos/services/sentry.webp",
    invert: false,
    status: "idle",
    requests: 2100,
  },
  {
    name: "Microsoft Teams",
    logo: "/logos/services/microsoft-teams.webp",
    invert: false,
    status: "active",
    requests: 5200,
  },
  {
    name: "OneDrive",
    logo: "/logos/services/one-drive.webp",
    invert: false,
    status: "active",
    requests: 4100,
  },
  {
    name: "Playwright",
    logo: "/logos/services/playwright.webp",
    invert: false,
    status: "idle",
    requests: 1400,
  },
];

const SERVICES_30D: ServiceRow[] = [
  {
    name: "GitHub",
    logo: "/logos/services/github.webp",
    invert: false,
    status: "active",
    requests: 86400,
  },
  {
    name: "Notion",
    logo: "/logos/services/notion.webp",
    invert: false,
    status: "active",
    requests: 72800,
  },
  {
    name: "Figma",
    logo: "/logos/services/figma.webp",
    invert: false,
    status: "active",
    requests: 51200,
  },
  {
    name: "Google Drive",
    logo: "/logos/services/google-drive.svg",
    invert: false,
    status: "active",
    requests: 35600,
  },
  {
    name: "Slack",
    logo: "/logos/services/slack.webp",
    invert: false,
    status: "active",
    requests: 29800,
  },
  {
    name: "PostgreSQL",
    logo: "/logos/services/postgresql.webp",
    invert: false,
    status: "active",
    requests: 23200,
  },
  {
    name: "Sentry",
    logo: "/logos/services/sentry.webp",
    invert: false,
    status: "idle",
    requests: 8400,
  },
  {
    name: "Microsoft Teams",
    logo: "/logos/services/microsoft-teams.webp",
    invert: false,
    status: "active",
    requests: 20800,
  },
  {
    name: "OneDrive",
    logo: "/logos/services/one-drive.webp",
    invert: false,
    status: "active",
    requests: 16400,
  },
  {
    name: "Playwright",
    logo: "/logos/services/playwright.webp",
    invert: false,
    status: "idle",
    requests: 5600,
  },
];

export const SERVICES_MAP = {
  "24h": SERVICES_24H,
  "7d": SERVICES_7D,
  "30d": SERVICES_30D,
} as const;

/* AIクライアントロゴ */
export const AI_CLIENTS = [
  { name: "Cursor", logo: "/logos/ai-clients/cursor.webp", invert: false },
  { name: "ChatGPT", logo: "/logos/ai-clients/chatgpt.webp", invert: false },
  { name: "Claude", logo: "/logos/ai-clients/claude.webp", invert: false },
  { name: "Copilot", logo: "/logos/ai-clients/copilot.webp", invert: false },
  { name: "Cline", logo: "/logos/ai-clients/cline.webp", invert: false },
  {
    name: "Antigravity",
    logo: "/logos/ai-clients/antigravity.webp",
    invert: false,
  },
] as const;

/* 期間別の統計データ */
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
