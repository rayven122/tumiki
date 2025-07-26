import type { OAuthProviderConfig } from "./types";
import { githubConfig } from "./github";
import { googleConfig } from "./google";
import { linkedinConfig } from "./linkedin";
import { notionConfig } from "./notion";
import { slackConfig } from "./slack";

export * from "./types";

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_PROVIDERS = [
  "google",
  "github",
  "slack",
  "notion",
  "linkedin",
] as const;

export const OAUTH_PROVIDER_CONFIG = {
  google: googleConfig,
  github: githubConfig,
  slack: slackConfig,
  notion: notionConfig,
  linkedin: linkedinConfig,
} as const satisfies Record<OAuthProvider, OAuthProviderConfig>;

export const PROVIDER_CONNECTIONS = {
  google: googleConfig.connection,
  github: githubConfig.connection,
  slack: slackConfig.connection,
  notion: notionConfig.connection,
  linkedin: linkedinConfig.connection,
} as const satisfies Record<OAuthProvider, string>;
