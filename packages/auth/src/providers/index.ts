import type { OAuthProvider, OAuthProviderMap } from "./types";
import { githubConfig } from "./github";
import { googleConfig } from "./google";
import { linkedinConfig } from "./linkedin";
import { notionConfig } from "./notion";
import { slackConfig } from "./slack";

export * from "./types";

export const OAUTH_PROVIDERS: OAuthProviderMap = {
  google: googleConfig,
  github: githubConfig,
  slack: slackConfig,
  notion: notionConfig,
  linkedin: linkedinConfig,
};

export const PROVIDER_CONNECTIONS: Record<OAuthProvider, string> = {
  google: googleConfig.connection,
  github: githubConfig.connection,
  slack: slackConfig.connection,
  notion: notionConfig.connection,
  linkedin: linkedinConfig.connection,
};
