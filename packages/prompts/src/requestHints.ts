/**
 * 位置情報プロンプト生成
 */

import type { RequestHints } from "./types.js";

/**
 * 位置情報ヒントからプロンプトを生成
 */
export const getRequestPromptFromHints = (
  requestHints: RequestHints,
): string => {
  return `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;
};
