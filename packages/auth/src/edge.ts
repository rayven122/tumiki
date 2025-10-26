/**
 * Edge Runtime対応の軽量認証ユーティリティ
 * Next.js middlewareでの使用を想定
 */

export { auth0, auth0OAuth } from "./clients.js";
export * from "./verification.js";
