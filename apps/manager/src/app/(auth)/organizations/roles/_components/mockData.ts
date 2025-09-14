import type { Role, Permission, OrganizationMember } from "./types";

// 権限のモックデータ
export const mockPermissions: Permission[] = [
  {
    id: "perm-1",
    resource: "organization",
    action: "manage",
    description: "組織の管理権限",
  },
  {
    id: "perm-2",
    resource: "members",
    action: "invite",
    description: "メンバーの招待権限",
  },
  {
    id: "perm-3",
    resource: "members",
    action: "view",
    description: "メンバーの閲覧権限",
  },
  {
    id: "perm-4",
    resource: "mcp_servers",
    action: "manage",
    description: "MCPサーバーの管理権限",
  },
  {
    id: "perm-5",
    resource: "mcp_servers",
    action: "use",
    description: "MCPサーバーの使用権限",
  },
];

// ロールのモックデータ
export const mockRoles: Role[] = [
  {
    id: "role-admin",
    name: "管理者",
    description: "すべての権限を持つロール",
    permissions: mockPermissions,
    memberCount: 2,
    isSystem: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "role-editor",
    name: "編集者",
    description: "コンテンツの編集権限を持つロール",
    permissions: mockPermissions.filter((p) =>
      ["view", "use"].includes(p.action),
    ),
    memberCount: 5,
    isSystem: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "role-viewer",
    name: "閲覧者",
    description: "閲覧のみ可能なロール",
    permissions: mockPermissions.filter((p) => p.action === "view"),
    memberCount: 10,
    isSystem: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "role-custom-1",
    name: "開発者",
    description: "MCPサーバーの使用と開発環境へのアクセス権限",
    permissions: mockPermissions.filter((p) =>
      p.resource.includes("mcp_servers"),
    ),
    memberCount: 3,
    isSystem: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-15"),
  },
];

// メンバーのモックデータ
export const mockMembers: OrganizationMember[] = [
  {
    id: "member-1",
    userId: "user-1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    role: mockRoles[0]!, // 管理者
    status: "active",
    joinedAt: new Date("2024-01-01"),
    isAdmin: true,
  },
  {
    id: "member-2",
    userId: "user-2",
    name: "佐藤 花子",
    email: "sato@example.com",
    avatarUrl: "https://i.pravatar.cc/150?img=2",
    role: mockRoles[1]!, // 編集者
    status: "active",
    joinedAt: new Date("2024-01-15"),
    isAdmin: false,
  },
  {
    id: "member-3",
    userId: "user-3",
    name: "鈴木 一郎",
    email: "suzuki@example.com",
    avatarUrl: "https://i.pravatar.cc/150?img=3",
    role: mockRoles[2]!, // 閲覧者
    status: "active",
    joinedAt: new Date("2024-02-01"),
    isAdmin: false,
  },
  {
    id: "member-4",
    userId: "user-4",
    name: "山田 美穂",
    email: "yamada@example.com",
    avatarUrl: "https://i.pravatar.cc/150?img=4",
    role: mockRoles[1]!, // 編集者
    status: "invited",
    invitedAt: new Date("2024-03-01"),
    isAdmin: false,
  },
  {
    id: "member-5",
    userId: "user-5",
    name: "高橋 健太",
    email: "takahashi@example.com",
    role: mockRoles[3]!, // カスタムロール（開発者）
    status: "inactive",
    joinedAt: new Date("2024-01-20"),
    isAdmin: false,
  },
];

// メールドメインのサジェスト用データ
export const commonEmailDomains = [
  "gmail.com",
  "yahoo.co.jp",
  "outlook.com",
  "icloud.com",
  "example.com",
];
