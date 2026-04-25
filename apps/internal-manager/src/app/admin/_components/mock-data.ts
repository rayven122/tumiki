/* 管理画面用モックデータ */

/* ===== ダッシュボード ===== */

export type Period = "24h" | "7d" | "30d";
export const PERIODS = [
  "24h",
  "7d",
  "30d",
] as const satisfies readonly Period[];

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

export const AI_PIE = [
  { name: "Cursor", value: 30, color: "#e4e4e7" },
  { name: "ChatGPT", value: 22, color: "#10a37f" },
  { name: "Claude", value: 18, color: "#DA704E" },
  { name: "Copilot", value: 14, color: "#2b88d8" },
  { name: "Cline", value: 10, color: "#71717a" },
  { name: "AG", value: 6, color: "#a855f7" },
];

export const CHART_LEGENDS = [
  { label: "Cursor", key: "cursor", color: "#e4e4e7" },
  { label: "ChatGPT", key: "chatgpt", color: "#10a37f" },
  { label: "Claude", key: "claude", color: "#DA704E" },
  { label: "Copilot", key: "copilot", color: "#2b88d8" },
  { label: "Cline", key: "cline", color: "#71717a" },
  { label: "AG", key: "ag", color: "#a855f7" },
] as const;

export type ConnectedService = {
  name: string;
  color: string;
  status: "active" | "idle";
  requests: number;
};

export const CONNECTED_SERVICES: ConnectedService[] = [
  { name: "GitHub", color: "#333333", status: "active", requests: 3420 },
  { name: "Notion", color: "#37352f", status: "active", requests: 2810 },
  { name: "Figma", color: "#f24e1e", status: "active", requests: 1960 },
  { name: "Google Drive", color: "#4285f4", status: "active", requests: 1340 },
  { name: "Slack", color: "#4a154b", status: "active", requests: 1120 },
  { name: "PostgreSQL", color: "#336791", status: "active", requests: 890 },
  {
    name: "Microsoft Teams",
    color: "#5059c9",
    status: "active",
    requests: 780,
  },
  { name: "Sentry", color: "#362d59", status: "idle", requests: 340 },
  { name: "Playwright", color: "#2ead33", status: "idle", requests: 210 },
];

export const MAX_SERVICE_REQUESTS = Math.max(
  ...CONNECTED_SERVICES.map((s) => s.requests),
);

/* ===== ユーザー管理 ===== */

export type UserRole = "Admin" | "Manager" | "Developer" | "Member";
export type UserStatus = "active" | "inactive" | "suspended";

export type OrgUser = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
  toolCount: number;
  requestCount: number;
};

export const ORG_USERS: OrgUser[] = [
  {
    id: "u1",
    name: "田中太郎",
    email: "tanaka@example.co.jp",
    department: "営業部",
    role: "Member",
    status: "active",
    lastLogin: "2026/03/29 09:00",
    toolCount: 5,
    requestCount: 847,
  },
  {
    id: "u2",
    name: "山田花子",
    email: "yamada@example.co.jp",
    department: "営業部",
    role: "Manager",
    status: "active",
    lastLogin: "2026/03/29 08:30",
    toolCount: 8,
    requestCount: 1234,
  },
  {
    id: "u3",
    name: "佐藤一郎",
    email: "sato@example.co.jp",
    department: "情報システム部",
    role: "Admin",
    status: "active",
    lastLogin: "2026/03/29 10:15",
    toolCount: 12,
    requestCount: 3456,
  },
  {
    id: "u4",
    name: "鈴木健太",
    email: "suzuki@example.co.jp",
    department: "開発部",
    role: "Developer",
    status: "active",
    lastLogin: "2026/03/28 18:45",
    toolCount: 10,
    requestCount: 2890,
  },
  {
    id: "u5",
    name: "高橋美咲",
    email: "takahashi@example.co.jp",
    department: "開発部",
    role: "Developer",
    status: "active",
    lastLogin: "2026/03/29 07:20",
    toolCount: 9,
    requestCount: 1567,
  },
  {
    id: "u6",
    name: "伊藤大輔",
    email: "ito@example.co.jp",
    department: "経理部",
    role: "Member",
    status: "active",
    lastLogin: "2026/03/27 16:00",
    toolCount: 3,
    requestCount: 234,
  },
  {
    id: "u7",
    name: "渡辺由美",
    email: "watanabe@example.co.jp",
    department: "人事部",
    role: "Member",
    status: "inactive",
    lastLogin: "2026/03/15 11:00",
    toolCount: 2,
    requestCount: 89,
  },
  {
    id: "u8",
    name: "中村直樹",
    email: "nakamura@example.co.jp",
    department: "開発部",
    role: "Developer",
    status: "suspended",
    lastLogin: "2026/03/20 09:00",
    toolCount: 0,
    requestCount: 456,
  },
];

/* ===== ロール・権限管理 ===== */

export type ServicePermissions = {
  service: string;
  color: string;
  tools: { name: string; enabled: boolean }[];
};

export type RoleDefinition = {
  id: string;
  name: UserRole;
  description: string;
  color: string;
  userCount: number;
  services: ServicePermissions[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "r1",
    name: "Admin",
    description: "全ツール・全操作にアクセス可能",
    color: "#34d399",
    userCount: 1,
    services: [
      {
        service: "Slack",
        color: "#4a154b",
        tools: [
          { name: "send_message", enabled: true },
          { name: "list_channels", enabled: true },
          { name: "search", enabled: true },
        ],
      },
      {
        service: "GitHub",
        color: "#333333",
        tools: [
          { name: "create_pr", enabled: true },
          { name: "list_issues", enabled: true },
          { name: "merge", enabled: true },
          { name: "review", enabled: true },
        ],
      },
      {
        service: "Notion",
        color: "#37352f",
        tools: [
          { name: "search_pages", enabled: true },
          { name: "create_page", enabled: true },
          { name: "export", enabled: true },
        ],
      },
      {
        service: "PostgreSQL",
        color: "#336791",
        tools: [
          { name: "query", enabled: true },
          { name: "export", enabled: true },
          { name: "schema", enabled: true },
        ],
      },
    ],
  },
  {
    id: "r2",
    name: "Manager",
    description: "部署内ツールの管理・承認権限",
    color: "#60a5fa",
    userCount: 1,
    services: [
      {
        service: "Slack",
        color: "#4a154b",
        tools: [
          { name: "send_message", enabled: true },
          { name: "list_channels", enabled: true },
          { name: "search", enabled: true },
        ],
      },
      {
        service: "GitHub",
        color: "#333333",
        tools: [
          { name: "create_pr", enabled: true },
          { name: "list_issues", enabled: true },
          { name: "merge", enabled: false },
          { name: "review", enabled: false },
        ],
      },
      {
        service: "Notion",
        color: "#37352f",
        tools: [
          { name: "search_pages", enabled: true },
          { name: "create_page", enabled: true },
          { name: "export", enabled: true },
        ],
      },
      {
        service: "PostgreSQL",
        color: "#336791",
        tools: [
          { name: "query", enabled: true },
          { name: "export", enabled: false },
          { name: "schema", enabled: false },
        ],
      },
    ],
  },
  {
    id: "r3",
    name: "Developer",
    description: "開発系ツールへのフルアクセス",
    color: "#a78bfa",
    userCount: 3,
    services: [
      {
        service: "Slack",
        color: "#4a154b",
        tools: [
          { name: "send_message", enabled: true },
          { name: "list_channels", enabled: true },
          { name: "search", enabled: false },
        ],
      },
      {
        service: "GitHub",
        color: "#333333",
        tools: [
          { name: "create_pr", enabled: true },
          { name: "list_issues", enabled: true },
          { name: "merge", enabled: true },
          { name: "review", enabled: true },
        ],
      },
      {
        service: "Notion",
        color: "#37352f",
        tools: [
          { name: "search_pages", enabled: true },
          { name: "create_page", enabled: false },
          { name: "export", enabled: false },
        ],
      },
      {
        service: "PostgreSQL",
        color: "#336791",
        tools: [
          { name: "query", enabled: true },
          { name: "export", enabled: true },
          { name: "schema", enabled: true },
        ],
      },
    ],
  },
  {
    id: "r4",
    name: "Member",
    description: "基本的な閲覧・利用のみ",
    color: "#fbbf24",
    userCount: 3,
    services: [
      {
        service: "Slack",
        color: "#4a154b",
        tools: [
          { name: "send_message", enabled: true },
          { name: "list_channels", enabled: true },
          { name: "search", enabled: false },
        ],
      },
      {
        service: "GitHub",
        color: "#333333",
        tools: [
          { name: "create_pr", enabled: false },
          { name: "list_issues", enabled: true },
          { name: "merge", enabled: false },
          { name: "review", enabled: false },
        ],
      },
      {
        service: "Notion",
        color: "#37352f",
        tools: [
          { name: "search_pages", enabled: true },
          { name: "create_page", enabled: false },
          { name: "export", enabled: false },
        ],
      },
      {
        service: "PostgreSQL",
        color: "#336791",
        tools: [
          { name: "query", enabled: false },
          { name: "export", enabled: false },
          { name: "schema", enabled: false },
        ],
      },
    ],
  },
];

/* ===== ツール管理 ===== */

export type ToolStatus = "active" | "degraded" | "down";
export type ToolProtocol = "stdio" | "sse" | "http";

export type Tool = {
  id: string;
  name: string;
  description: string;
  color: string;
  status: ToolStatus;
  protocol: ToolProtocol;
  approved: boolean;
  operationCount: number;
  allowedCount: number;
};

export const TOOLS: Tool[] = [
  {
    id: "t1",
    name: "Slack",
    description: "チームコミュニケーション・メッセージ管理",
    color: "#4a154b",
    status: "active",
    protocol: "http",
    approved: true,
    operationCount: 3,
    allowedCount: 3,
  },
  {
    id: "t2",
    name: "GitHub",
    description: "ソースコード管理・PR・イシュー操作",
    color: "#333333",
    status: "active",
    protocol: "http",
    approved: true,
    operationCount: 4,
    allowedCount: 4,
  },
  {
    id: "t3",
    name: "Notion",
    description: "ドキュメント作成・ページ管理",
    color: "#37352f",
    status: "active",
    protocol: "sse",
    approved: true,
    operationCount: 3,
    allowedCount: 3,
  },
  {
    id: "t4",
    name: "Microsoft Teams",
    description: "Teamsチャット・チャンネル操作",
    color: "#5059c9",
    status: "active",
    protocol: "http",
    approved: true,
    operationCount: 2,
    allowedCount: 2,
  },
  {
    id: "t5",
    name: "Figma",
    description: "デザインファイル閲覧・エクスポート",
    color: "#f24e1e",
    status: "active",
    protocol: "sse",
    approved: true,
    operationCount: 3,
    allowedCount: 2,
  },
  {
    id: "t6",
    name: "Google Drive",
    description: "ファイル検索・アップロード・共有",
    color: "#4285f4",
    status: "active",
    protocol: "http",
    approved: true,
    operationCount: 3,
    allowedCount: 3,
  },
  {
    id: "t7",
    name: "PostgreSQL",
    description: "データベースクエリ・スキーマ確認",
    color: "#336791",
    status: "active",
    protocol: "stdio",
    approved: true,
    operationCount: 3,
    allowedCount: 3,
  },
  {
    id: "t8",
    name: "Sentry",
    description: "エラートラッキング・イシュー管理",
    color: "#362d59",
    status: "degraded",
    protocol: "http",
    approved: true,
    operationCount: 3,
    allowedCount: 3,
  },
  {
    id: "t9",
    name: "Vercel",
    description: "デプロイメント管理・ログ確認",
    color: "#111111",
    status: "down",
    protocol: "http",
    approved: false,
    operationCount: 4,
    allowedCount: 0,
  },
  {
    id: "t10",
    name: "Playwright",
    description: "ブラウザ自動化・E2Eテスト実行",
    color: "#2ead33",
    status: "down",
    protocol: "stdio",
    approved: false,
    operationCount: 5,
    allowedCount: 0,
  },
];

/* ===== 監査ログ ===== */

export type LogStatus = "success" | "blocked" | "error";

export type AuditLog = {
  id: string;
  datetime: string;
  user: string;
  department: string;
  aiClient: string;
  aiClientColor: string;
  tool: string;
  toolColor: string;
  operation: string;
  status: LogStatus;
  latency: string;
};

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "a1",
    datetime: "03/29 14:32:15",
    user: "田中太郎",
    department: "営業部",
    aiClient: "Cursor",
    aiClientColor: "#e4e4e7",
    tool: "Slack",
    toolColor: "#4a154b",
    operation: "send_message",
    status: "success",
    latency: "142ms",
  },
  {
    id: "a2",
    datetime: "03/29 14:28:03",
    user: "鈴木健太",
    department: "開発部",
    aiClient: "Claude",
    aiClientColor: "#DA704E",
    tool: "GitHub",
    toolColor: "#333333",
    operation: "create_pr",
    status: "success",
    latency: "320ms",
  },
  {
    id: "a3",
    datetime: "03/29 14:25:41",
    user: "高橋美咲",
    department: "開発部",
    aiClient: "Cursor",
    aiClientColor: "#e4e4e7",
    tool: "Sentry",
    toolColor: "#362d59",
    operation: "list_issues",
    status: "success",
    latency: "85ms",
  },
  {
    id: "a4",
    datetime: "03/29 14:20:12",
    user: "山田花子",
    department: "営業部",
    aiClient: "ChatGPT",
    aiClientColor: "#10a37f",
    tool: "Notion",
    toolColor: "#37352f",
    operation: "create_page",
    status: "success",
    latency: "110ms",
  },
  {
    id: "a5",
    datetime: "03/29 14:15:33",
    user: "不明",
    department: "—",
    aiClient: "不明",
    aiClientColor: "#71717a",
    tool: "PostgreSQL",
    toolColor: "#336791",
    operation: "export_data",
    status: "blocked",
    latency: "23ms",
  },
  {
    id: "a6",
    datetime: "03/29 14:10:05",
    user: "田中太郎",
    department: "営業部",
    aiClient: "Copilot",
    aiClientColor: "#2b88d8",
    tool: "Vercel",
    toolColor: "#111111",
    operation: "get_contact",
    status: "blocked",
    latency: "18ms",
  },
  {
    id: "a7",
    datetime: "03/29 13:55:22",
    user: "伊藤大輔",
    department: "経理部",
    aiClient: "ChatGPT",
    aiClientColor: "#10a37f",
    tool: "Google Drive",
    toolColor: "#4285f4",
    operation: "search_files",
    status: "success",
    latency: "210ms",
  },
  {
    id: "a8",
    datetime: "03/29 13:40:18",
    user: "鈴木健太",
    department: "開発部",
    aiClient: "Cursor",
    aiClientColor: "#e4e4e7",
    tool: "GitHub",
    toolColor: "#333333",
    operation: "merge_pr",
    status: "success",
    latency: "450ms",
  },
  {
    id: "a9",
    datetime: "03/29 13:30:44",
    user: "高橋美咲",
    department: "開発部",
    aiClient: "Claude",
    aiClientColor: "#DA704E",
    tool: "PostgreSQL",
    toolColor: "#336791",
    operation: "query",
    status: "success",
    latency: "35ms",
  },
  {
    id: "a10",
    datetime: "03/29 13:20:10",
    user: "山田花子",
    department: "営業部",
    aiClient: "ChatGPT",
    aiClientColor: "#10a37f",
    tool: "Slack",
    toolColor: "#4a154b",
    operation: "search_messages",
    status: "success",
    latency: "230ms",
  },
  {
    id: "a11",
    datetime: "03/29 12:45:00",
    user: "中村直樹",
    department: "開発部",
    aiClient: "Cursor",
    aiClientColor: "#e4e4e7",
    tool: "GitHub",
    toolColor: "#333333",
    operation: "push_code",
    status: "blocked",
    latency: "15ms",
  },
  {
    id: "a12",
    datetime: "03/29 12:30:22",
    user: "田中太郎",
    department: "営業部",
    aiClient: "Cline",
    aiClientColor: "#71717a",
    tool: "Notion",
    toolColor: "#37352f",
    operation: "create_post",
    status: "success",
    latency: "95ms",
  },
];

/* ===== ステータスバッジ ===== */

type BadgeConfig = { bg: string; text: string; label: string };

const STATUS_BADGE_MAP: Record<string, BadgeConfig> = {
  success: {
    bg: "bg-badge-success-bg",
    text: "text-badge-success-text",
    label: "成功",
  },
  blocked: {
    bg: "bg-badge-error-bg",
    text: "text-badge-error-text",
    label: "ブロック",
  },
  error: {
    bg: "bg-badge-error-bg",
    text: "text-badge-error-text",
    label: "エラー",
  },
};

const DEFAULT_BADGE: BadgeConfig = {
  bg: "bg-badge-error-bg",
  text: "text-badge-error-text",
  label: "エラー",
};

export const getStatusBadge = (status: string): BadgeConfig =>
  STATUS_BADGE_MAP[status] ?? DEFAULT_BADGE;

/* ===== グループ管理 ===== */

export type GroupSyncStatus = "synced" | "pending" | "error";
export type SyncTrigger = "jit" | "scim" | "manual";
export type SyncHistoryStatus = "success" | "failed" | "partial";

export type Group = {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  idpGroup: string | null;
  syncStatus: GroupSyncStatus;
  lastSync: string | null;
  allowedTools: string[]; // tool ids
};

export type SyncHistory = {
  id: string;
  trigger: SyncTrigger;
  status: SyncHistoryStatus;
  datetime: string;
  added: number;
  removed: number;
  errors: number;
  detail: string | null;
};

export const GROUPS: Group[] = [
  {
    id: "g1",
    name: "開発チーム",
    description: "エンジニア・開発者グループ",
    color: "#a78bfa",
    memberCount: 12,
    idpGroup: "dev-team@example.com",
    syncStatus: "synced",
    lastSync: "2026/04/25 09:00",
    allowedTools: ["t1", "t2", "t3", "t7", "t8"],
  },
  {
    id: "g2",
    name: "営業チーム",
    description: "営業・セールスグループ",
    color: "#34d399",
    memberCount: 8,
    idpGroup: "sales-team@example.com",
    syncStatus: "synced",
    lastSync: "2026/04/25 09:00",
    allowedTools: ["t1", "t3", "t4", "t6"],
  },
  {
    id: "g3",
    name: "経理・管理部",
    description: "経理・バックオフィスグループ",
    color: "#fbbf24",
    memberCount: 5,
    idpGroup: null,
    syncStatus: "pending",
    lastSync: null,
    allowedTools: ["t1", "t6"],
  },
  {
    id: "g4",
    name: "IT管理者",
    description: "情報システム部・管理者",
    color: "#f87171",
    memberCount: 2,
    idpGroup: "it-admin@example.com",
    syncStatus: "error",
    lastSync: "2026/04/24 15:30",
    allowedTools: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"],
  },
];

export const SYNC_HISTORY: SyncHistory[] = [
  {
    id: "sh1",
    trigger: "scim",
    status: "success",
    datetime: "2026/04/25 09:00",
    added: 2,
    removed: 0,
    errors: 0,
    detail: null,
  },
  {
    id: "sh2",
    trigger: "jit",
    status: "success",
    datetime: "2026/04/24 16:42",
    added: 1,
    removed: 0,
    errors: 0,
    detail: null,
  },
  {
    id: "sh3",
    trigger: "manual",
    status: "failed",
    datetime: "2026/04/24 15:30",
    added: 0,
    removed: 0,
    errors: 3,
    detail: "IdP接続タイムアウト: グループ 'IT管理者' の同期に失敗しました",
  },
  {
    id: "sh4",
    trigger: "scim",
    status: "partial",
    datetime: "2026/04/23 09:00",
    added: 5,
    removed: 1,
    errors: 1,
    detail: "1件のユーザーマッピングが失敗しました",
  },
  {
    id: "sh5",
    trigger: "jit",
    status: "success",
    datetime: "2026/04/22 11:15",
    added: 1,
    removed: 0,
    errors: 0,
    detail: null,
  },
];

/* ===== 承認管理 ===== */

export type ApprovalUrgency = "high" | "normal" | "low";

export type PendingApproval = {
  id: string;
  date: string;
  user: string;
  department: string;
  tool: string;
  toolColor: string;
  type: string;
  permissions: string[];
  purpose: string;
  urgency: ApprovalUrgency;
};

export const PENDING_APPROVALS: PendingApproval[] = [
  {
    id: "pa1",
    date: "2026/03/29",
    user: "田中太郎",
    department: "営業部",
    tool: "Vercel",
    toolColor: "#111111",
    type: "新規利用申請",
    permissions: ["read", "write"],
    purpose: "Q4営業活動の顧客情報参照",
    urgency: "high",
  },
  {
    id: "pa2",
    date: "2026/03/28",
    user: "鈴木健太",
    department: "開発部",
    tool: "Vercel",
    toolColor: "#111111",
    type: "新規利用申請",
    permissions: ["read", "execute"],
    purpose: "デプロイ管理の自動化",
    urgency: "normal",
  },
  {
    id: "pa3",
    date: "2026/03/27",
    user: "高橋美咲",
    department: "開発部",
    tool: "Playwright",
    toolColor: "#2ead33",
    type: "新規利用申請",
    permissions: ["read", "execute"],
    purpose: "E2Eテストの自動化",
    urgency: "normal",
  },
  {
    id: "pa4",
    date: "2026/03/26",
    user: "伊藤大輔",
    department: "経理部",
    tool: "Playwright",
    toolColor: "#2ead33",
    type: "権限追加",
    permissions: ["write"],
    purpose: "経費登録の効率化",
    urgency: "low",
  },
];
