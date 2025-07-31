import { z } from "zod";

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_PROVIDERS = [
  "google",
  "github",
  "slack",
  "notion",
  "linkedin",
  "figma",
] as const;

export const PROVIDER_CONNECTIONS = {
  google: "google-oauth2",
  github: "github",
  slack: "sign-in-with-slack",
  notion: "Notion",
  linkedin: "linkedin",
  figma: "figma",
} as const satisfies Record<OAuthProvider, string>;

/**
 * OAuthプロバイダーのZodスキーマ
 * OAUTH_PROVIDERSオブジェクトのキーから動的に生成
 */
export const OauthProviderSchema = z.enum(OAUTH_PROVIDERS);

/**
 * 有効なOAuthプロバイダーかどうかを検証
 */
export const isValidOAuthProvider = (
  provider: string,
): provider is OAuthProvider => {
  return OAUTH_PROVIDERS.includes(provider as OAuthProvider);
};
