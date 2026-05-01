// Permission: 何のリソースに対して何の操作を許可するか
// Group 経由の付与（GroupPermission）と、個別承認による付与（UserPermission）の 2 系統

import type { GroupId, PermissionId, TenantId, UserId } from "./branded.js";

// 抽象的な action 名。tumiki 内では tool 別の操作に解釈される
export type PermissionAction = "read" | "write" | "execute";

// resourcePattern は MCP server 名や tool 名のパターンを想定
// 例: "mcp:github/*" や "tool:gmail.send"
export type GroupPermission = {
  readonly id: PermissionId;
  readonly tenantId: TenantId;
  readonly groupId: GroupId;
  readonly resourcePattern: string;
  readonly actions: ReadonlyArray<PermissionAction>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// 個別承認: 一時的な例外権限。expiresAt で自動失効
export type UserPermission = {
  readonly id: PermissionId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly resourcePattern: string;
  readonly actions: ReadonlyArray<PermissionAction>;
  readonly approvedBy: UserId;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
};
