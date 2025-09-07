/**
 * @fileoverview 簡素化されたLRUキャッシュシステムのメインエントリーポイント
 *
 * 必要最低限の機能を提供する、シンプルで再利用可能な
 * キャッシュシステムの統一されたインターフェースです。
 */

// コア機能
export type { CacheStats, CacheInstance } from "./core.js";
export { createLRUCache } from "./core.js";

// ドメイン固有ファクトリー
export {
  createToolsCache,
  createAuthCache,
  createSessionCache,
  createDataCache,
  type ToolsCacheEntry,
  type ServerConfig,
} from "./domains.js";
