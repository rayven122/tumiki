import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Apps
  "apps/manager/vitest.config.ts",
  "apps/proxyServer/vitest.config.ts",

  // Packages
  "packages/auth/vitest.config.ts",
  // TODO: packages/dbのテストにはPostgreSQL(db-test)コンテナが必要なため除外
  // CI環境でサービスコンテナを追加する場合は.github/workflows/ci.ymlにservices設定が必要
  // ローカル開発時: docker compose -f ./docker/compose.dev.yaml up -d db-test
  // "packages/db/vitest.config.ts",
  "packages/mailer/vitest.config.ts",
  "packages/scripts/vitest.config.ts",
  "packages/youtube-mcp/vitest.config.ts",

  // Tooling
  "tooling/vitest/vitest.config.ts",
]);
