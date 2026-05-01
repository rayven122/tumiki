// Membership: User が Group に所属する関係
// source 情報を含めて PK にすることで、SCIM/JIT/Pull 由来の異なる経路を区別保持

import type { GroupId, SourceId, TenantId, UserId } from "./branded.js";

export type Membership = {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly groupId: GroupId;
  // この membership がどの provisioning 経路から生まれたか
  readonly source: SourceId;
  readonly createdAt: Date;
};
