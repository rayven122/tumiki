export const DESKTOP_API_SETTINGS_ID = "default";

export const DESKTOP_API_SETTINGS_DEFAULTS = {
  organizationName: null,
  organizationSlug: null,
  catalogEnabled: false,
  accessRequestsEnabled: false,
  policySyncEnabled: false,
  auditLogSyncEnabled: true,
} as const;

export const DEFAULT_DESKTOP_API_SETTINGS = {
  id: DESKTOP_API_SETTINGS_ID,
  ...DESKTOP_API_SETTINGS_DEFAULTS,
} as const;
