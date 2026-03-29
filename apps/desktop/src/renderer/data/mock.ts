/**
 * UIモック用のダミーデータ
 * プロダクト開発時にAPIレスポンスに差し替え
 */

/* ===== ユーザー ===== */
export const CURRENT_USER = {
  name: "田中太郎",
  email: "tanaka@example.co.jp",
  department: "営業部",
  role: "Member",
  employeeId: "EMP-00123",
  lastLogin: "2026/03/29 09:00",
} as const;

/* ===== ツール ===== */
export type ToolStatus = "active" | "degraded" | "down";
export type PermissionLevel = "read" | "write" | "execute";

export type ToolOperation = {
  name: string;
  description: string;
  allowed: boolean;
};

export type Tool = {
  id: string;
  name: string;
  logoDark: string;
  logoLight: string;
  description: string;
  status: ToolStatus;
  permissions: PermissionLevel[];
  operations: ToolOperation[];
  lastUsed: string;
  protocol: string;
  endpoint: string;
  addedDate: string;
  admin: string;
  stats: { requests: number; successRate: number; avgLatency: number };
  approved: boolean;
  category: string;
  requiredApproval?: string;
  availableDepartments?: string;
};

export const TOOLS: Tool[] = [
  {
    id: "slack",
    name: "Slack",
    logoDark: "/logos/services/slack.webp",
    logoLight: "/logos/services/slack.webp",
    description: "メッセージ送信・検索・チャンネル管理",
    status: "active",
    permissions: ["read", "write"],
    operations: [
      {
        name: "send_message",
        description: "チャンネルへのメッセージ送信",
        allowed: true,
      },
      {
        name: "search_messages",
        description: "メッセージの検索",
        allowed: true,
      },
      {
        name: "list_channels",
        description: "チャンネル一覧の取得",
        allowed: true,
      },
      {
        name: "create_channel",
        description: "チャンネルの新規作成",
        allowed: false,
      },
      {
        name: "delete_message",
        description: "メッセージの削除",
        allowed: false,
      },
      { name: "manage_members", description: "メンバー管理", allowed: false },
    ],
    lastUsed: "5分前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.slack.com",
    addedDate: "2026/02/15",
    admin: "情報システム部",
    stats: { requests: 234, successRate: 98.7, avgLatency: 142 },
    approved: true,
    category: "コミュニケーション",
  },
  {
    id: "jira",
    name: "Jira",
    logoDark: "/logos/services/database.webp",
    logoLight: "/logos/services/database.webp",
    description: "チケット作成・更新・検索",
    status: "degraded",
    permissions: ["read", "execute"],
    operations: [
      { name: "create_issue", description: "チケットの作成", allowed: true },
      { name: "search_issues", description: "チケットの検索", allowed: true },
      { name: "update_issue", description: "チケットの更新", allowed: false },
      { name: "delete_issue", description: "チケットの削除", allowed: false },
    ],
    lastUsed: "2時間前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.jira.example.com",
    addedDate: "2026/01/20",
    admin: "情報システム部",
    stats: { requests: 156, successRate: 94.2, avgLatency: 380 },
    approved: true,
    category: "業務管理",
  },
  {
    id: "github",
    name: "GitHub",
    logoDark: "/logos/services/github_white.svg",
    logoLight: "/logos/services/github_black.svg",
    description: "リポジトリ操作・PR管理",
    status: "down",
    permissions: ["read"],
    operations: [
      {
        name: "list_repos",
        description: "リポジトリ一覧の取得",
        allowed: true,
      },
      { name: "get_file", description: "ファイルの取得", allowed: true },
      { name: "create_pr", description: "PRの作成", allowed: false },
      { name: "merge_pr", description: "PRのマージ", allowed: false },
    ],
    lastUsed: "昨日",
    protocol: "MCP (Streamable HTTP)",
    endpoint: "mcp.github.example.com",
    addedDate: "2026/01/10",
    admin: "情報システム部",
    stats: { requests: 89, successRate: 97.8, avgLatency: 210 },
    approved: true,
    category: "開発",
  },
  {
    id: "esa",
    name: "esa",
    logoDark: "/logos/services/notion.webp",
    logoLight: "/logos/services/notion.webp",
    description: "記事の作成・検索・編集",
    status: "active",
    permissions: ["read", "write"],
    operations: [
      { name: "create_post", description: "記事の作成", allowed: true },
      { name: "search_posts", description: "記事の検索", allowed: true },
      { name: "update_post", description: "記事の更新", allowed: true },
    ],
    lastUsed: "30分前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.esa.example.com",
    addedDate: "2026/02/01",
    admin: "情報システム部",
    stats: { requests: 312, successRate: 99.1, avgLatency: 95 },
    approved: true,
    category: "ドキュメント",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    logoDark: "/logos/services/google-drive.svg",
    logoLight: "/logos/services/google-drive.svg",
    description: "ファイル検索・アップロード・共有",
    status: "active",
    permissions: ["read"],
    operations: [
      { name: "search_files", description: "ファイルの検索", allowed: true },
      {
        name: "upload_file",
        description: "ファイルのアップロード",
        allowed: false,
      },
      { name: "share_file", description: "ファイルの共有設定", allowed: false },
    ],
    lastUsed: "1時間前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.gdrive.example.com",
    addedDate: "2026/02/20",
    admin: "情報システム部",
    stats: { requests: 178, successRate: 99.4, avgLatency: 120 },
    approved: true,
    category: "ファイル管理",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    logoDark: "/logos/services/database.webp",
    logoLight: "/logos/services/database.webp",
    description: "CRM・顧客管理",
    status: "active",
    permissions: [],
    operations: [
      { name: "get_contact", description: "顧客情報の参照", allowed: false },
      { name: "update_contact", description: "顧客情報の更新", allowed: false },
      { name: "delete_contact", description: "顧客情報の削除", allowed: false },
      {
        name: "export_report",
        description: "レポートのエクスポート",
        allowed: false,
      },
    ],
    lastUsed: "—",
    protocol: "MCP (SSE)",
    endpoint: "mcp.salesforce.example.com",
    addedDate: "2026/01/05",
    admin: "情報システム部",
    stats: { requests: 0, successRate: 0, avgLatency: 0 },
    approved: false,
    category: "営業",
    requiredApproval: "部長承認",
    availableDepartments: "営業部（管理職以上）",
  },
  {
    id: "freee",
    name: "freee",
    logoDark: "/logos/services/database.webp",
    logoLight: "/logos/services/database.webp",
    description: "会計・経費精算",
    status: "active",
    permissions: [],
    operations: [
      { name: "create_expense", description: "経費の登録", allowed: false },
      { name: "search_invoices", description: "請求書の検索", allowed: false },
    ],
    lastUsed: "—",
    protocol: "MCP (SSE)",
    endpoint: "mcp.freee.example.com",
    addedDate: "2026/03/01",
    admin: "経理部",
    stats: { requests: 0, successRate: 0, avgLatency: 0 },
    approved: false,
    category: "会計",
    requiredApproval: "情シス承認",
    availableDepartments: "経理部",
  },
  {
    id: "notion",
    name: "Notion",
    logoDark: "/logos/services/notion.webp",
    logoLight: "/logos/services/notion.webp",
    description: "ページ検索・作成・編集",
    status: "active",
    permissions: ["read", "write"],
    operations: [
      { name: "search_pages", description: "ページの検索", allowed: true },
      { name: "create_page", description: "ページの作成", allowed: true },
      { name: "update_page", description: "ページの更新", allowed: true },
      { name: "delete_page", description: "ページの削除", allowed: false },
    ],
    lastUsed: "20分前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.notion.example.com",
    addedDate: "2026/01/15",
    admin: "情報システム部",
    stats: { requests: 289, successRate: 99.3, avgLatency: 110 },
    approved: true,
    category: "ドキュメント",
  },
  {
    id: "figma",
    name: "Figma",
    logoDark: "/logos/services/figma.webp",
    logoLight: "/logos/services/figma.webp",
    description: "デザイントークン・コメント取得",
    status: "active",
    permissions: ["read"],
    operations: [
      {
        name: "get_design_tokens",
        description: "デザイントークンの取得",
        allowed: true,
      },
      {
        name: "list_comments",
        description: "コメント一覧の取得",
        allowed: true,
      },
      { name: "export_svg", description: "SVGエクスポート", allowed: false },
    ],
    lastUsed: "3時間前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.figma.example.com",
    addedDate: "2026/02/10",
    admin: "情報システム部",
    stats: { requests: 145, successRate: 98.6, avgLatency: 195 },
    approved: true,
    category: "デザイン",
  },
  {
    id: "sentry",
    name: "Sentry",
    logoDark: "/logos/services/sentry.webp",
    logoLight: "/logos/services/sentry.webp",
    description: "エラー監視・アラート管理",
    status: "active",
    permissions: ["read"],
    operations: [
      { name: "list_issues", description: "エラー一覧の取得", allowed: true },
      {
        name: "get_issue_detail",
        description: "エラー詳細の取得",
        allowed: true,
      },
      { name: "resolve_issue", description: "エラーの解決", allowed: false },
    ],
    lastUsed: "1時間前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.sentry.example.com",
    addedDate: "2026/02/25",
    admin: "情報システム部",
    stats: { requests: 98, successRate: 100, avgLatency: 85 },
    approved: true,
    category: "開発",
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    logoDark: "/logos/services/microsoft-teams.webp",
    logoLight: "/logos/services/microsoft-teams.webp",
    description: "メッセージ・会議・チャネル",
    status: "active",
    permissions: ["read", "write"],
    operations: [
      { name: "send_message", description: "メッセージの送信", allowed: true },
      {
        name: "list_channels",
        description: "チャネル一覧の取得",
        allowed: true,
      },
      { name: "create_meeting", description: "会議の作成", allowed: false },
    ],
    lastUsed: "45分前",
    protocol: "MCP (SSE)",
    endpoint: "mcp.teams.example.com",
    addedDate: "2026/03/05",
    admin: "情報システム部",
    stats: { requests: 210, successRate: 97.6, avgLatency: 165 },
    approved: true,
    category: "コミュニケーション",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    logoDark: "/logos/services/postgresql.webp",
    logoLight: "/logos/services/postgresql.webp",
    description: "クエリ実行・スキーマ取得",
    status: "active",
    permissions: ["read"],
    operations: [
      { name: "query", description: "SQLクエリの実行", allowed: true },
      { name: "get_schema", description: "スキーマの取得", allowed: true },
      {
        name: "export_data",
        description: "データのエクスポート",
        allowed: false,
      },
    ],
    lastUsed: "4時間前",
    protocol: "MCP (Streamable HTTP)",
    endpoint: "mcp.db.example.com",
    addedDate: "2026/01/25",
    admin: "情報システム部",
    stats: { requests: 167, successRate: 99.4, avgLatency: 45 },
    approved: true,
    category: "データベース",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    logoDark: "/logos/services/one-drive.webp",
    logoLight: "/logos/services/one-drive.webp",
    description: "ファイル管理・共有",
    status: "active",
    permissions: ["read"],
    operations: [
      { name: "search_files", description: "ファイルの検索", allowed: true },
      {
        name: "download_file",
        description: "ファイルのダウンロード",
        allowed: true,
      },
      {
        name: "upload_file",
        description: "ファイルのアップロード",
        allowed: false,
      },
    ],
    lastUsed: "昨日",
    protocol: "MCP (SSE)",
    endpoint: "mcp.onedrive.example.com",
    addedDate: "2026/03/10",
    admin: "情報システム部",
    stats: { requests: 78, successRate: 100, avgLatency: 130 },
    approved: true,
    category: "ファイル管理",
  },
  {
    id: "playwright",
    name: "Playwright",
    logoDark: "/logos/services/playwright.webp",
    logoLight: "/logos/services/playwright.webp",
    description: "ブラウザ操作・テスト自動化",
    status: "active",
    permissions: [],
    operations: [
      { name: "navigate", description: "ページ遷移", allowed: false },
      {
        name: "screenshot",
        description: "スクリーンショット取得",
        allowed: false,
      },
      { name: "click", description: "要素クリック", allowed: false },
    ],
    lastUsed: "—",
    protocol: "MCP (SSE)",
    endpoint: "mcp.playwright.example.com",
    addedDate: "2026/03/15",
    admin: "情報システム部",
    stats: { requests: 0, successRate: 0, avgLatency: 0 },
    approved: false,
    category: "開発",
    requiredApproval: "情シス承認",
    availableDepartments: "開発部",
  },
  {
    id: "vercel",
    name: "Vercel",
    logoDark: "/logos/services/vercel.webp",
    logoLight: "/logos/services/vercel.webp",
    description: "デプロイ管理・環境変数",
    status: "active",
    permissions: [],
    operations: [
      {
        name: "list_deployments",
        description: "デプロイ一覧の取得",
        allowed: false,
      },
      { name: "get_env", description: "環境変数の取得", allowed: false },
    ],
    lastUsed: "—",
    protocol: "MCP (SSE)",
    endpoint: "mcp.vercel.example.com",
    addedDate: "2026/03/20",
    admin: "情報システム部",
    stats: { requests: 0, successRate: 0, avgLatency: 0 },
    approved: false,
    category: "開発",
    requiredApproval: "部長承認",
    availableDepartments: "開発部",
  },
];

/* ===== 操作履歴 ===== */
export type HistoryStatus = "success" | "timeout" | "blocked" | "error";

export type HistoryItem = {
  id: string;
  datetime: string;
  tool: string;
  operation: string;
  status: HistoryStatus;
  latency: string;
  detail: string;
  requestId: string;
  errorReason?: string;
  requiredRole?: string;
};

export const HISTORY: HistoryItem[] = [
  {
    id: "h1",
    datetime: "03/29 14:32:15",
    tool: "Slack",
    operation: "send_message",
    status: "success",
    latency: "142ms",
    detail: "#sales-team に送信",
    requestId: "req_a1b2c3",
  },
  {
    id: "h2",
    datetime: "03/29 14:28:03",
    tool: "esa",
    operation: "create_post",
    status: "success",
    latency: "95ms",
    detail: "「週次レポート」を作成",
    requestId: "req_d4e5f6",
  },
  {
    id: "h3",
    datetime: "03/29 13:55:41",
    tool: "Jira",
    operation: "create_issue",
    status: "timeout",
    latency: "5000ms",
    detail: "タイムアウト",
    requestId: "req_g7h8i9",
  },
  {
    id: "h4",
    datetime: "03/29 13:40:22",
    tool: "Slack",
    operation: "search_messages",
    status: "success",
    latency: "230ms",
    detail: "「Q3 report」で検索",
    requestId: "req_j0k1l2",
  },
  {
    id: "h5",
    datetime: "03/29 11:15:08",
    tool: "GitHub",
    operation: "get_file",
    status: "success",
    latency: "180ms",
    detail: "README.md を取得",
    requestId: "req_m3n4o5",
  },
  {
    id: "h6",
    datetime: "03/29 10:02:33",
    tool: "Salesforce",
    operation: "get_contact",
    status: "blocked",
    latency: "23ms",
    detail: "権限不足（403 Forbidden）",
    requestId: "req_abc123",
    errorReason:
      "ロール「Member」にはSalesforceの get_contact操作の実行権限がありません",
    requiredRole: "Manager 以上",
  },
  {
    id: "h7",
    datetime: "03/28 17:45:12",
    tool: "Slack",
    operation: "send_message",
    status: "success",
    latency: "118ms",
    detail: "#general に送信",
    requestId: "req_p6q7r8",
  },
  {
    id: "h8",
    datetime: "03/28 16:30:55",
    tool: "esa",
    operation: "update_post",
    status: "success",
    latency: "105ms",
    detail: "「議事録0328」を更新",
    requestId: "req_s9t0u1",
  },
  {
    id: "h9",
    datetime: "03/28 15:20:10",
    tool: "Google Drive",
    operation: "search_files",
    status: "success",
    latency: "210ms",
    detail: "「契約書」で検索",
    requestId: "req_v2w3x4",
  },
  {
    id: "h10",
    datetime: "03/28 14:10:30",
    tool: "Jira",
    operation: "search_issues",
    status: "success",
    latency: "320ms",
    detail: "「sprint-42」で検索",
    requestId: "req_y5z6a7",
  },
  {
    id: "h11",
    datetime: "03/28 10:05:22",
    tool: "Slack",
    operation: "list_channels",
    status: "success",
    latency: "95ms",
    detail: "チャンネル一覧取得",
    requestId: "req_b8c9d0",
  },
  {
    id: "h12",
    datetime: "03/27 16:45:00",
    tool: "GitHub",
    operation: "list_repos",
    status: "success",
    latency: "250ms",
    detail: "リポジトリ一覧取得",
    requestId: "req_e1f2g3",
  },
];

/* ===== 権限申請 ===== */
export type RequestStatus = "pending" | "approved" | "rejected";

export type PermissionRequest = {
  id: string;
  date: string;
  tool: string;
  type: string;
  requestedPermissions: string[];
  requestedOperations: string[];
  purpose: string;
  period: string;
  status: RequestStatus;
  approvers: {
    name: string;
    department: string;
    status: RequestStatus | "waiting";
    date?: string;
  }[];
  comment?: string;
  rejectReason?: string;
};

export const REQUESTS: PermissionRequest[] = [
  {
    id: "r1",
    date: "2026/03/29",
    tool: "Salesforce",
    type: "新規利用申請",
    requestedPermissions: ["read", "write"],
    requestedOperations: ["get_contact", "update_contact"],
    purpose:
      "Q4の営業活動において、顧客情報をAIエージェント経由で参照・更新する必要があるため",
    period: "2026/04/01 ～ 2026/06/30",
    status: "pending",
    approvers: [
      {
        name: "山田花子",
        department: "営業部 部長",
        status: "pending",
        date: "2026/03/29 10:15",
      },
      { name: "佐藤一郎", department: "情報システム部", status: "waiting" },
    ],
  },
  {
    id: "r2",
    date: "2026/03/25",
    tool: "freee",
    type: "新規利用申請",
    requestedPermissions: ["read"],
    requestedOperations: ["search_invoices"],
    purpose: "経費精算の効率化のため、AIエージェントで請求書検索を行いたい",
    period: "無期限",
    status: "approved",
    approvers: [
      {
        name: "佐藤一郎",
        department: "情報システム部",
        status: "approved",
        date: "2026/03/26 14:00",
      },
    ],
  },
  {
    id: "r3",
    date: "2026/03/20",
    tool: "AWS Console",
    type: "新規利用申請",
    requestedPermissions: ["read", "execute"],
    requestedOperations: ["describe_instances", "start_instance"],
    purpose: "開発環境のインスタンス管理を自動化したい",
    period: "無期限",
    status: "rejected",
    approvers: [
      {
        name: "佐藤一郎",
        department: "情報システム部",
        status: "rejected",
        date: "2026/03/21 09:30",
      },
    ],
    rejectReason:
      "営業部は対象外のツールです。開発部への異動後に再申請してください。",
  },
];

/* ===== 通知設定 ===== */
export type NotificationSetting = {
  id: string;
  label: string;
  enabled: boolean;
};

export const EMAIL_NOTIFICATIONS: NotificationSetting[] = [
  { id: "approval_result", label: "権限申請の承認結果", enabled: true },
  {
    id: "tool_maintenance",
    label: "ツールの停止・メンテナンス",
    enabled: true,
  },
  { id: "new_tool", label: "新しいツールの追加", enabled: false },
  { id: "weekly_report", label: "週次利用レポート", enabled: false },
];

export const PORTAL_NOTIFICATIONS: NotificationSetting[] = [
  { id: "operation_error", label: "操作エラー", enabled: true },
  { id: "permission_change", label: "権限変更", enabled: true },
];

/* ===== お知らせ ===== */
export const ANNOUNCEMENTS = [
  {
    id: "a1",
    message: "「経費精算ツール」が新しく利用可能になりました",
    link: "/tools/catalog",
    date: "03/28",
  },
  {
    id: "a2",
    message: "メンテナンス予定: 4/5 (土) 02:00-04:00",
    link: null,
    date: "03/27",
  },
] as const;

/* ===== カテゴリ ===== */
export const CATEGORIES = [
  "すべて",
  "コミュニケーション",
  "開発",
  "業務管理",
  "データ分析",
  "ファイル管理",
  "営業",
  "会計",
  "ドキュメント",
  "デザイン",
  "データベース",
] as const;
