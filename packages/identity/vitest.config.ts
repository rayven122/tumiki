import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        // re-export のみの barrel ファイルはカバレッジ対象外
        "src/**/index.ts",
        // 純粋な型定義のみ（実行コードを含まない）はカバレッジ対象外
        "src/domain/events.ts",
        "src/domain/group.ts",
        "src/domain/identity.ts",
        "src/domain/membership.ts",
        "src/domain/permission.ts",
        "src/domain/tenant.ts",
        "src/ports/**",
      ],
      // プロジェクト規約「カバレッジ 100% 目標」を CI で担保
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
