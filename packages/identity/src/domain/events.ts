// Domain Events: provisioning pipeline と observability の中核
// adapter は capability 経由で取得した状態を normalize し、これらの event を発行する
// observers (audit / metrics / notification) が同じ event stream を購読する

import type {
  ExternalId,
  GroupId,
  SourceId,
  TenantId,
  UserId,
} from "./branded.js";
import type { CanonicalEmail } from "./email.js";
import type { GroupOrigin } from "./group.js";
import type { IdentityAttributes } from "./identity.js";

// すべての domain event に共通する meta 情報
export type EventMeta = {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly tenantId: TenantId;
  readonly source: SourceId;
  // pipeline 実行 ID（同じ pipeline 1 回分の event を束ねる）
  readonly causationId: string;
  // 一連の同期処理単位（Pull の 1 サイクル等）
  readonly correlationId: string;
  // 冪等性キー: 同一 key の 2 回目は no-op とすべき
  readonly idempotencyKey: string;
};

// User upsert: 新規作成または属性更新
export type UserUpsertedEvent = {
  readonly type: "UserUpserted";
  readonly meta: EventMeta;
  readonly payload: {
    readonly externalId: ExternalId;
    readonly email: CanonicalEmail;
    readonly emailVerified: boolean;
    readonly displayName: string;
    readonly attributes: IdentityAttributes;
  };
};

// User deactivate: authoritative source からの停止指示
// authoritative_source 以外からの deactivate は無視されるべき
export type UserDeactivatedEvent = {
  readonly type: "UserDeactivated";
  readonly meta: EventMeta;
  readonly payload: {
    readonly externalId: ExternalId;
    readonly reason: string;
  };
};

// Group upsert
export type GroupUpsertedEvent = {
  readonly type: "GroupUpserted";
  readonly meta: EventMeta;
  readonly payload: {
    readonly externalId: ExternalId;
    readonly origin: GroupOrigin;
    readonly name: string;
    readonly description: string | null;
  };
};

// Group delete
export type GroupDeletedEvent = {
  readonly type: "GroupDeleted";
  readonly meta: EventMeta;
  readonly payload: {
    readonly externalId: ExternalId;
  };
};

// Membership 全置換: 指定 group のメンバーをこの集合に置き換える
// 部分 update ではなく snapshot として扱う（Pull に最適）
export type MembershipSetEvent = {
  readonly type: "MembershipSet";
  readonly meta: EventMeta;
  readonly payload: {
    readonly groupExternalId: ExternalId;
    readonly memberExternalIds: ReadonlyArray<ExternalId>;
  };
};

// Identity Linking が確定した event（pipeline 内部の audit 用）
export type IdentityLinkedEvent = {
  readonly type: "IdentityLinked";
  readonly meta: EventMeta;
  readonly payload: {
    readonly userId: UserId;
    readonly externalId: ExternalId;
    readonly strategy: "external_id" | "email" | "new_user";
  };
};

// Membership に変化があった派生 event（Applier が発行）
export type MembershipChangedEvent = {
  readonly type: "MembershipChanged";
  readonly meta: EventMeta;
  readonly payload: {
    readonly userId: UserId;
    readonly groupId: GroupId;
    readonly action: "added" | "removed";
  };
};

export type DomainEvent =
  | UserUpsertedEvent
  | UserDeactivatedEvent
  | GroupUpsertedEvent
  | GroupDeletedEvent
  | MembershipSetEvent
  | IdentityLinkedEvent
  | MembershipChangedEvent;

export type DomainEventType = DomainEvent["type"];
