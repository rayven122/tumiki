import type { CatalogSeedData } from "./catalog.repository";

/**
 * Desktop用MCPカタログのシードデータ
 * 動作確認済みのMCPのみ登録。追加はDEV-1461で調査後に実施。
 */
export const CATALOG_SEEDS: readonly CatalogSeedData[] = [
  {
    name: "Filesystem STDIO",
    description:
      "ファイルシステム操作 - ローカルファイルの読み書き（開発・テスト用）",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    credentialKeys: [],
    authType: "NONE",
    isOfficial: true,
  },
  {
    name: "Sequential Thinking STDIO",
    description: "段階的思考サーバー - 複雑な問題解決のための段階的推論支援",
    iconPath: "/logos/services/database.svg",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    credentialKeys: [],
    authType: "NONE",
    isOfficial: true,
  },
];
