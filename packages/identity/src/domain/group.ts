// Group: tumiki 認可の単位
// 外部 IdP の group / role / OU と対応するか、tumiki 独自に作成される

import type { ExternalId, GroupId, SourceId, TenantId } from "./branded.js";

// 外部 IdP から同期された group か、tumiki UI から手動作成された group か
export type GroupOrigin = "IDP" | "TUMIKI";

export type Group = {
  readonly id: GroupId;
  readonly tenantId: TenantId;
  readonly origin: GroupOrigin;
  // origin === "IDP" のときのみ source / externalId が non-null
  readonly source: SourceId | null;
  readonly externalId: ExternalId | null;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
