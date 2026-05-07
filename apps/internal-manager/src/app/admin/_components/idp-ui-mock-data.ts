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

export type RoleType = "system" | "custom";

export type RolePermission = {
  toolId: string;
  effect: "allow" | "deny";
};

export type MockRole = {
  id: string;
  name: string;
  description: string;
  type: RoleType;
  source: IdpSource;
  readonly: boolean;
  permissions: RolePermission[];
  updatedAt: string;
  updatedBy: string;
};

export type AssignmentTargetType = "org" | "group" | "user";

export type MockRoleAssignment = {
  id: string;
  roleId: string;
  targetType: AssignmentTargetType;
  targetId: string;
  scopePath?: string;
  inherited: boolean;
  reason?: string;
  expiresAt?: string;
};

export const roleTypeLabel: Record<RoleType, string> = {
  system: "システム標準",
  custom: "カスタム",
};

export const roleTypeBadgeClass: Record<RoleType, string> = {
  system: "bg-sky-500/15 text-sky-300",
  custom: "bg-emerald-500/15 text-emerald-300",
};

export const mockRoles: MockRole[] = [
  {
    id: "role-platform-engineer",
    name: "Platform Engineer",
    description: "GitHub PR・監査ログ閲覧などプラットフォーム標準権限",
    type: "system",
    source: "tumiki",
    readonly: true,
    permissions: [
      { toolId: "github-pr", effect: "allow" },
      { toolId: "audit-log", effect: "allow" },
      { toolId: "prod-db", effect: "deny" },
    ],
    updatedAt: "2026-04-15",
    updatedBy: "system",
  },
  {
    id: "role-security-reviewer",
    name: "Security Reviewer",
    description: "監査ログ閲覧 + Sentry 参照のみ",
    type: "system",
    source: "tumiki",
    readonly: true,
    permissions: [
      { toolId: "audit-log", effect: "allow" },
      { toolId: "slack-admin", effect: "deny" },
    ],
    updatedAt: "2026-04-10",
    updatedBy: "system",
  },
  {
    id: "role-it-operator",
    name: "IT Operator",
    description: "Slack ワークスペース管理・Google Drive 管理",
    type: "system",
    source: "tumiki",
    readonly: true,
    permissions: [
      { toolId: "slack-admin", effect: "allow" },
      { toolId: "prod-db", effect: "deny" },
    ],
    updatedAt: "2026-03-28",
    updatedBy: "system",
  },
  {
    id: "role-ai-program",
    name: "AI 推進メンバー",
    description: "AI 推進チーム向けの横断例外権限",
    type: "custom",
    source: "tumiki",
    readonly: false,
    permissions: [
      { toolId: "github-pr", effect: "allow" },
      { toolId: "audit-log", effect: "allow" },
    ],
    updatedAt: "2026-04-30",
    updatedBy: "水野 美奈",
  },
  {
    id: "role-temporary-prod-readonly",
    name: "本番 DB Read-only (一時)",
    description: "障害対応時の一時的な参照権限",
    type: "custom",
    source: "tumiki",
    readonly: false,
    permissions: [{ toolId: "prod-db", effect: "allow" }],
    updatedAt: "2026-05-01",
    updatedBy: "佐倉 蓮",
  },
];

export const mockRoleAssignments: MockRoleAssignment[] = [
  {
    id: "assign-platform-engineer-org",
    roleId: "role-platform-engineer",
    targetType: "org",
    targetId: "engineering",
    inherited: false,
    reason: "開発部の標準権限",
  },
  {
    id: "assign-platform-engineer-platform",
    roleId: "role-platform-engineer",
    targetType: "org",
    targetId: "platform",
    inherited: true,
    reason: "開発部から継承",
  },
  {
    id: "assign-security-reviewer-security",
    roleId: "role-security-reviewer",
    targetType: "org",
    targetId: "security",
    inherited: false,
    reason: "情報セキュリティ部の標準権限",
  },
  {
    id: "assign-security-reviewer-group",
    roleId: "role-security-reviewer",
    targetType: "group",
    targetId: "security-reviewers",
    inherited: false,
    reason: "監査担当グループ",
  },
  {
    id: "assign-it-operator-it",
    roleId: "role-it-operator",
    targetType: "org",
    targetId: "it",
    inherited: false,
    reason: "情報システム部の標準権限",
  },
  {
    id: "assign-ai-program-group",
    roleId: "role-ai-program",
    targetType: "group",
    targetId: "ai-program",
    inherited: false,
    reason: "AI 推進チーム横断例外",
  },
  {
    id: "assign-temporary-prod-readonly-user",
    roleId: "role-temporary-prod-readonly",
    targetType: "user",
    targetId: "user-mina",
    inherited: false,
    reason: "障害対応 INC-2451 の一時例外",
    expiresAt: "2026-05-14",
  },
];

export const getUserById = (id: string) =>
  mockUsers.find((user) => user.id === id);

export const getOrgById = (id: string) =>
  mockOrgUnits.find((org) => org.id === id);

export const getGroupById = (id: string) =>
  mockGroups.find((group) => group.id === id);

export const getRoleById = (id: string) =>
  mockRoles.find((role) => role.id === id);

export const getToolById = (id: string) =>
  mockTools.find((tool) => tool.id === id);

export const getAssignmentsForTarget = (
  targetType: AssignmentTargetType,
  targetId: string,
) =>
  mockRoleAssignments.filter(
    (assignment) =>
      assignment.targetType === targetType && assignment.targetId === targetId,
  );

export const getAssignmentsForRole = (roleId: string) =>
  mockRoleAssignments.filter((assignment) => assignment.roleId === roleId);
