import type { OrganizationId } from "@/schema/ids";

// Branded types for type safety
export type RoleId = string & { __brand: "RoleId" };
export type EmailAddress = string & { __brand: "EmailAddress" };

// ロール関連の型定義
export type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  memberCount: number;
  isSystem: boolean; // システムロール（管理者、編集者など）か、カスタムロールか
  createdAt: Date;
  updatedAt: Date;
};

export type Permission = {
  id: string;
  resource: string;
  action: string;
  description?: string;
};

// MCPサーバー権限の型定義
export type MCPServerPermission = {
  id: string;
  serverId: string;
  serverName: string;
  tools: MCPToolPermission[];
  roleId: string;
};

export type MCPToolPermission = {
  toolId: string;
  toolName: string;
  hasAccess: boolean;
};

// メンバー関連の型定義
export type OrganizationMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  status: "active" | "invited" | "inactive";
  joinedAt?: Date;
  invitedAt?: Date;
  isAdmin: boolean;
};

// 招待関連の型定義
export type InvitationFormData = {
  emails: string[];
  roleId: string;
  isAdmin: boolean;
  customMessage?: string;
  sendImmediately: boolean;
};

export type InvitationStatus =
  | "pending"
  | "sent"
  | "accepted"
  | "expired"
  | "error";

export type Invitation = {
  id: string;
  email: string;
  organizationId: OrganizationId;
  roleId?: string;
  isAdmin: boolean;
  status: InvitationStatus;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  errorMessage?: string;
};

// バリデーション関連の型定義
export type ValidationError = {
  field: string;
  message: string;
};

export type InvitationResult = {
  success: boolean;
  email: string;
  error?: string;
};
