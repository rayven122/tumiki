import { z } from "zod";

import type { OAuthProvider } from "./index";
import { OAUTH_PROVIDERS } from "./index";

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
