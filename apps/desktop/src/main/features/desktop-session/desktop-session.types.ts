export type DesktopSessionUser = {
  id: string;
  sub: string;
  name: string | null;
  email: string | null;
  role: string;
};

export type DesktopSessionOrganization = {
  id: string | null;
  slug: string | null;
  name: string | null;
};

export type DesktopSessionGroup = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  provider: string | null;
  externalId: string | null;
  membershipSource: string;
  lastSyncedAt: string | null;
};

export type DesktopSessionPermission = {
  source: "GROUP" | "INDIVIDUAL";
  groupId?: string;
  mcpServerId: string;
  read: boolean;
  write: boolean;
  execute: boolean;
  reason?: string;
  approvedAt?: string | null;
  expiresAt?: string | null;
};

export type DesktopSessionFeatures = {
  catalog: boolean;
  accessRequests: boolean;
  policySync: boolean;
  auditLogSync: boolean;
};

export type DesktopSession = {
  user: DesktopSessionUser;
  organization: DesktopSessionOrganization;
  groups: DesktopSessionGroup[];
  permissions: DesktopSessionPermission[];
  features: DesktopSessionFeatures;
  policyVersion: string;
};
