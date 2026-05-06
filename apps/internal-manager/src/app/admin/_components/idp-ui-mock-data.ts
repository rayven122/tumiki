export type IdpSource =
  | "tumiki"
  | "google"
  | "entra"
  | "okta"
  | "keycloak"
  | "scim";

export type PolicyEffect = "allow" | "deny" | "unset";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  title: string;
  status: "active" | "suspended";
  source: IdpSource;
  orgId: string;
  groupIds: string[];
};

export type MockOrgUnit = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  source: IdpSource;
  readonly: boolean;
  adminScope: string;
  delegatedAdmin: string;
  inheritedFrom: string | null;
  userIds: string[];
  policies: {
    label: string;
    value: "許可" | "拒否" | "未設定";
    inherited: boolean;
  }[];
};

export type MockGroup = {
  id: string;
  name: string;
  description: string;
  source: IdpSource;
  readonly: boolean;
  syncState: "synced" | "manual" | "pending";
  externalId: string | null;
  memberIds: string[];
  assignedPolicies: string[];
};

export type MockTool = {
  id: string;
  catalog: string;
  name: string;
  risk: "low" | "medium" | "high";
  orgEffect: PolicyEffect;
  groupEffect: PolicyEffect;
  userEffect: PolicyEffect;
  inheritedFrom: string;
  reason: string;
};

export const sourceLabel: Record<IdpSource, string> = {
  tumiki: "Tumiki 独自",
  google: "Google Workspace",
  entra: "Entra",
  okta: "Okta",
  keycloak: "Keycloak",
  scim: "SCIM",
};

export const sourceBadgeClass: Record<IdpSource, string> = {
  tumiki: "bg-emerald-500/15 text-emerald-300",
  google: "bg-blue-500/15 text-blue-300",
  entra: "bg-sky-500/15 text-sky-300",
  okta: "bg-purple-500/15 text-purple-300",
  keycloak: "bg-amber-500/15 text-amber-300",
  scim: "bg-zinc-500/20 text-zinc-300",
};

export const effectBadgeClass: Record<PolicyEffect, string> = {
  allow: "bg-emerald-500/15 text-emerald-300",
  deny: "bg-red-500/15 text-red-300",
  unset: "bg-zinc-500/20 text-zinc-300",
};

export const mockUsers: MockUser[] = [
  {
    id: "user-aoi",
    name: "青井 玲",
    email: "aoi.rei@example.com",
    title: "Platform Engineer",
    status: "active",
    source: "google",
    orgId: "platform",
    groupIds: ["security-reviewers", "github-admins"],
  },
  {
    id: "user-mina",
    name: "水野 美奈",
    email: "mina.mizuno@example.com",
    title: "Security Manager",
    status: "active",
    source: "entra",
    orgId: "security",
    groupIds: ["security-reviewers", "ai-program"],
  },
  {
    id: "user-kei",
    name: "高橋 圭",
    email: "kei.takahashi@example.com",
    title: "Sales Ops",
    status: "active",
    source: "okta",
    orgId: "sales",
    groupIds: ["ai-program"],
  },
  {
    id: "user-ren",
    name: "佐倉 蓮",
    email: "ren.sakura@example.com",
    title: "IT Administrator",
    status: "suspended",
    source: "keycloak",
    orgId: "it",
    groupIds: ["github-admins"],
  },
];

export const mockOrgUnits: MockOrgUnit[] = [
  {
    id: "root",
    name: "Rayven",
    path: "/",
    parentId: null,
    source: "google",
    readonly: true,
    adminScope: "全社",
    delegatedAdmin: "Global Admin",
    inheritedFrom: null,
    userIds: [],
    policies: [
      { label: "GitHub", value: "許可", inherited: false },
      { label: "Slack 管理", value: "未設定", inherited: false },
      { label: "本番 DB", value: "拒否", inherited: false },
    ],
  },
  {
    id: "engineering",
    name: "開発部",
    path: "/engineering",
    parentId: "root",
    source: "google",
    readonly: true,
    adminScope: "開発組織",
    delegatedAdmin: "Engineering Admin",
    inheritedFrom: "Rayven",
    userIds: [],
    policies: [
      { label: "GitHub", value: "許可", inherited: false },
      { label: "Slack 管理", value: "未設定", inherited: true },
      { label: "本番 DB", value: "拒否", inherited: true },
    ],
  },
  {
    id: "platform",
    name: "Platform チーム",
    path: "/engineering/platform",
    parentId: "engineering",
    source: "google",
    readonly: true,
    adminScope: "Platform",
    delegatedAdmin: "Platform Lead",
    inheritedFrom: "開発部",
    userIds: ["user-aoi"],
    policies: [
      { label: "GitHub", value: "許可", inherited: true },
      { label: "監査ログ閲覧", value: "許可", inherited: false },
      { label: "本番 DB", value: "拒否", inherited: true },
    ],
  },
  {
    id: "security",
    name: "情報セキュリティ部",
    path: "/security",
    parentId: "root",
    source: "entra",
    readonly: true,
    adminScope: "Administrative unit",
    delegatedAdmin: "Security Admin",
    inheritedFrom: "Rayven",
    userIds: ["user-mina"],
    policies: [
      { label: "監査ログ閲覧", value: "許可", inherited: false },
      { label: "Slack 管理", value: "拒否", inherited: false },
      { label: "本番 DB", value: "拒否", inherited: true },
    ],
  },
  {
    id: "it",
    name: "情報システム部",
    path: "/it",
    parentId: "root",
    source: "keycloak",
    readonly: true,
    adminScope: "Keycloak nested group",
    delegatedAdmin: "IT Admin",
    inheritedFrom: "Rayven",
    userIds: ["user-ren"],
    policies: [
      { label: "Slack 管理", value: "許可", inherited: false },
      { label: "Google Drive", value: "許可", inherited: false },
      { label: "本番 DB", value: "拒否", inherited: true },
    ],
  },
  {
    id: "sales",
    name: "営業部",
    path: "/sales",
    parentId: "root",
    source: "scim",
    readonly: true,
    adminScope: "SCIM department",
    delegatedAdmin: "Sales Ops Admin",
    inheritedFrom: "Rayven",
    userIds: ["user-kei"],
    policies: [
      { label: "CRM", value: "許可", inherited: false },
      { label: "GitHub", value: "未設定", inherited: false },
      { label: "本番 DB", value: "拒否", inherited: true },
    ],
  },
];

export const mockGroups: MockGroup[] = [
  {
    id: "ai-program",
    name: "AI 推進チーム",
    description: "部署横断で AI 利用ルールを検証する Tumiki 独自グループ",
    source: "tumiki",
    readonly: false,
    syncState: "manual",
    externalId: null,
    memberIds: ["user-mina", "user-kei"],
    assignedPolicies: ["GitHub PR 作成", "Google Drive 検索"],
  },
  {
    id: "security-reviewers",
    name: "Security Reviewers",
    description: "監査・セキュリティ確認担当",
    source: "entra",
    readonly: true,
    syncState: "synced",
    externalId: "entra:sec-reviewers",
    memberIds: ["user-aoi", "user-mina"],
    assignedPolicies: ["監査ログ閲覧", "Sentry 参照"],
  },
  {
    id: "github-admins",
    name: "GitHub Admins",
    description: "GitHub 管理権限を持つ人の集合",
    source: "okta",
    readonly: true,
    syncState: "synced",
    externalId: "okta:00g-github-admins",
    memberIds: ["user-aoi", "user-ren"],
    assignedPolicies: ["GitHub Repository 管理"],
  },
  {
    id: "workspace-all",
    name: "Google Workspace group",
    description: "Google Workspace から同期された既存グループ",
    source: "google",
    readonly: true,
    syncState: "synced",
    externalId: "group:workspace-admins@example.com",
    memberIds: ["user-aoi", "user-kei"],
    assignedPolicies: ["Google Drive 管理"],
  },
];

export const mockTools: MockTool[] = [
  {
    id: "github-pr",
    catalog: "GitHub",
    name: "Pull request 作成",
    risk: "medium",
    orgEffect: "allow",
    groupEffect: "allow",
    userEffect: "unset",
    inheritedFrom: "開発部",
    reason: "開発部の標準権限と AI 推進チームの例外許可",
  },
  {
    id: "audit-log",
    catalog: "Tumiki",
    name: "監査ログ閲覧",
    risk: "low",
    orgEffect: "unset",
    groupEffect: "allow",
    userEffect: "unset",
    inheritedFrom: "Security Reviewers",
    reason: "Security Reviewers グループの横断権限",
  },
  {
    id: "slack-admin",
    catalog: "Slack",
    name: "ワークスペース管理",
    risk: "high",
    orgEffect: "deny",
    groupEffect: "unset",
    userEffect: "unset",
    inheritedFrom: "情報セキュリティ部",
    reason: "組織の拒否ルールが優先",
  },
  {
    id: "prod-db",
    catalog: "PostgreSQL",
    name: "本番 DB 操作",
    risk: "high",
    orgEffect: "deny",
    groupEffect: "deny",
    userEffect: "deny",
    inheritedFrom: "ユーザー例外",
    reason: "明示的なユーザー拒否",
  },
];

export const getUserById = (id: string) =>
  mockUsers.find((user) => user.id === id);

export const getOrgById = (id: string) =>
  mockOrgUnits.find((org) => org.id === id);

export const getGroupById = (id: string) =>
  mockGroups.find((group) => group.id === id);
