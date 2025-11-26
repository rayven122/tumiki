/**
 * MCPサーバーのセキュリティスキャンスクリプト
 *
 * 後方互換性のためのエントリーポイント
 * 実際の処理は ./security-scan/index.ts に移動
 *
 * Usage: pnpm run security:scan:mcp
 */
import { main } from "./security-scan/index";

void main();
