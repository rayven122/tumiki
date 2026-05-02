// GroupDirectoryPort: 外部 IdP から Group / Membership 情報を取得する capability

import type {
  RemoteFetchResult,
  RemoteGroupSnapshot,
  RemoteMembershipSnapshot,
} from "./types.js";

export type GroupDirectoryPort = {
  readonly fetchAllGroups: () => Promise<
    RemoteFetchResult<RemoteGroupSnapshot>
  >;

  // 各 group のメンバー集合を取得
  // Pull で全置換同期する用途、MembershipSetEvent を発行する元データ
  readonly fetchAllMemberships: () => Promise<
    RemoteFetchResult<RemoteMembershipSnapshot>
  >;
};
