// User: tumiki ドメインの中心エンティティ
// 同一人物が複数 IdP に存在しても 1 つの User に統合される

import type { SourceId, TenantId, UserId } from "./branded.js";
import type { CanonicalEmail } from "./email.js";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type User = {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: CanonicalEmail;
  readonly displayName: string;
  readonly status: UserStatus;
  // どの source が deactivate 等の権限を持つか
  // テナント設定の authoritative_for_users と整合する
  readonly authoritativeSource: SourceId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export const isActive = (user: User): boolean => user.status === "ACTIVE";
