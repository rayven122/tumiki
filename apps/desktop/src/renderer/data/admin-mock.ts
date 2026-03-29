/**
 * 管理者ページ用モックデータ
 */

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

/* ===== ロール定義 ===== */
export type RolePermission = {
  tool: string;
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type RoleDefinition = {
  name: UserRole;
  description: string;
  color: string;
  userCount: number;
  permissions: RolePermission[];
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: "Admin",
    description: "全ツール・全操作にアクセス可能",
    color: "#34d399",
    userCount: 1,
    permissions: [
      { tool: "Slack", read: true, write: true, execute: true },
      { tool: "GitHub", read: true, write: true, execute: true },
      { tool: "Notion", read: true, write: true, execute: true },
      { tool: "Microsoft Teams", read: true, write: true, execute: true },
      { tool: "Figma", read: true, write: true, execute: true },
      { tool: "Google Drive", read: true, write: true, execute: true },
      { tool: "PostgreSQL", read: true, write: true, execute: true },
      { tool: "Sentry", read: true, write: true, execute: true },
    ],
  },
  {
    name: "Manager",
    description: "部署内ツールの管理・承認権限",
    color: "#60a5fa",
    userCount: 1,
    permissions: [
      { tool: "Slack", read: true, write: true, execute: true },
      { tool: "GitHub", read: true, write: true, execute: false },
      { tool: "Notion", read: true, write: true, execute: true },
      { tool: "Microsoft Teams", read: true, write: true, execute: true },
      { tool: "Figma", read: true, write: false, execute: false },
      { tool: "Google Drive", read: true, write: true, execute: false },
      { tool: "PostgreSQL", read: true, write: false, execute: false },
      { tool: "Sentry", read: true, write: false, execute: false },
    ],
  },
  {
    name: "Developer",
    description: "開発系ツールへのフルアクセス",
    color: "#a78bfa",
    userCount: 3,
    permissions: [
      { tool: "Slack", read: true, write: true, execute: false },
      { tool: "GitHub", read: true, write: true, execute: true },
      { tool: "Notion", read: true, write: false, execute: false },
      { tool: "Microsoft Teams", read: true, write: true, execute: true },
      { tool: "Figma", read: true, write: false, execute: false },
      { tool: "Google Drive", read: true, write: false, execute: false },
      { tool: "PostgreSQL", read: true, write: true, execute: true },
      { tool: "Sentry", read: true, write: true, execute: true },
    ],
  },
  {
    name: "Member",
    description: "基本的な閲覧・利用のみ",
    color: "#fbbf24",
    userCount: 3,
    permissions: [
      { tool: "Slack", read: true, write: true, execute: false },
      { tool: "GitHub", read: true, write: false, execute: false },
      { tool: "Notion", read: true, write: false, execute: false },
      { tool: "Microsoft Teams", read: true, write: false, execute: false },
      { tool: "Figma", read: true, write: false, execute: false },
      { tool: "Google Drive", read: true, write: false, execute: false },
      { tool: "PostgreSQL", read: false, write: false, execute: false },
      { tool: "Sentry", read: false, write: false, execute: false },
    ],
  },
];

/* ===== 監査ログ（全ユーザー） ===== */
export type AuditLogEntry = {
  id: string;
  datetime: string;
  user: string;
  department: string;
  tool: string;
  operation: string;
  status: "success" | "blocked" | "error";
  latency: string;
  detail: string;
};

export const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "a1",
    datetime: "03/29 14:32:15",
    user: "田中太郎",
    department: "営業部",
    tool: "Slack",
    operation: "send_message",
    status: "success",
    latency: "142ms",
    detail: "#sales-team に送信",
  },
  {
    id: "a2",
    datetime: "03/29 14:28:03",
    user: "鈴木健太",
    department: "開発部",
    tool: "GitHub",
    operation: "create_pr",
    status: "success",
    latency: "320ms",
    detail: "PR #187: API修正",
  },
  {
    id: "a3",
    datetime: "03/29 14:25:41",
    user: "高橋美咲",
    department: "開発部",
    tool: "Sentry",
    operation: "list_issues",
    status: "success",
    latency: "85ms",
    detail: "未解決エラー一覧",
  },
  {
    id: "a4",
    datetime: "03/29 14:20:12",
    user: "山田花子",
    department: "営業部",
    tool: "Notion",
    operation: "create_page",
    status: "success",
    latency: "110ms",
    detail: "週次レポート作成",
  },
  {
    id: "a5",
    datetime: "03/29 14:15:33",
    user: "不明",
    department: "—",
    tool: "PostgreSQL",
    operation: "export_data",
    status: "blocked",
    latency: "23ms",
    detail: "未認証アクセス",
  },
  {
    id: "a6",
    datetime: "03/29 14:10:05",
    user: "田中太郎",
    department: "営業部",
    tool: "Vercel",
    operation: "get_contact",
    status: "blocked",
    latency: "18ms",
    detail: "権限不足",
  },
  {
    id: "a7",
    datetime: "03/29 13:55:22",
    user: "伊藤大輔",
    department: "経理部",
    tool: "Google Drive",
    operation: "search_files",
    status: "success",
    latency: "210ms",
    detail: "契約書検索",
  },
  {
    id: "a8",
    datetime: "03/29 13:40:18",
    user: "鈴木健太",
    department: "開発部",
    tool: "GitHub",
    operation: "merge_pr",
    status: "success",
    latency: "450ms",
    detail: "PR #185 マージ",
  },
  {
    id: "a9",
    datetime: "03/29 13:30:44",
    user: "高橋美咲",
    department: "開発部",
    tool: "PostgreSQL",
    operation: "query",
    status: "success",
    latency: "35ms",
    detail: "SELECT実行",
  },
  {
    id: "a10",
    datetime: "03/29 13:20:10",
    user: "山田花子",
    department: "営業部",
    tool: "Slack",
    operation: "search_messages",
    status: "success",
    latency: "230ms",
    detail: "Q3 report 検索",
  },
  {
    id: "a11",
    datetime: "03/29 12:45:00",
    user: "中村直樹",
    department: "開発部",
    tool: "GitHub",
    operation: "push_code",
    status: "blocked",
    latency: "15ms",
    detail: "アカウント停止中",
  },
  {
    id: "a12",
    datetime: "03/29 12:30:22",
    user: "田中太郎",
    department: "営業部",
    tool: "esa",
    operation: "create_post",
    status: "success",
    latency: "95ms",
    detail: "議事録作成",
  },
];

/* ===== 承認待ち ===== */
export type PendingApproval = {
  id: string;
  date: string;
  user: string;
  department: string;
  tool: string;
  type: string;
  permissions: string[];
  purpose: string;
  urgency: "high" | "normal" | "low";
};

export const PENDING_APPROVALS: PendingApproval[] = [
  {
    id: "pa1",
    date: "2026/03/29",
    user: "田中太郎",
    department: "営業部",
    tool: "Vercel",
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
    type: "権限追加",
    permissions: ["write"],
    purpose: "経費登録の効率化",
    urgency: "low",
  },
];
