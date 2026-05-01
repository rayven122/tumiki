// Port が外部 IdP から取得する snapshot の正規化形
// Adapter ごとの IdP 固有形式から、これらの型に変換する責務は Adapter 側にある

import type { ExternalId, SourceId } from "../domain/branded.js";
import type { GroupOrigin } from "../domain/group.js";
import type { IdentityAttributes } from "../domain/identity.js";

// Adapter から見た「外部 IdP の User の現状」のスナップショット
export type RemoteUserSnapshot = {
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly displayName: string;
  readonly active: boolean;
  readonly attributes: IdentityAttributes;
};

// 外部 IdP の Group の現状スナップショット
export type RemoteGroupSnapshot = {
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly origin: GroupOrigin;
  readonly name: string;
  readonly description: string | null;
};

// Group とそのメンバー集合のスナップショット
export type RemoteMembershipSnapshot = {
  readonly source: SourceId;
  readonly groupExternalId: ExternalId;
  readonly memberExternalIds: ReadonlyArray<ExternalId>;
};

// fetch 系の戻り値: 結果と取得時刻を pair で返す（冪等性 hash 算出に使う）
export type RemoteFetchResult<T> = {
  readonly fetchedAt: Date;
  readonly items: ReadonlyArray<T>;
};
