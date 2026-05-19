import type { InlineConfig } from "vitest";

const testTimeout = Number(process.env.VITEST_TEST_TIMEOUT_MS ?? 30_000);
const hookTimeout = Number(process.env.VITEST_HOOK_TIMEOUT_MS ?? 10_000);

// 基本的なテスト設定
export const baseTestConfig: InlineConfig = {
  globals: true,
  setupFiles: ["@tumiki/vitest-config/setup"],
  passWithNoTests: true,
  testTimeout,
  hookTimeout,
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.{idea,git,cache,output,temp}/**",
  ],
};

// Node.js環境用の設定
export const nodeTestConfig: InlineConfig = {
  ...baseTestConfig,
  environment: "node",
};

// ブラウザ環境用の設定
export const browserTestConfig: InlineConfig = {
  ...baseTestConfig,
  environment: "jsdom",
};
