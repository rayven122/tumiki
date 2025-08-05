import type { InlineConfig } from "vitest";

// 基本的なテスト設定
export const baseTestConfig: InlineConfig = {
  globals: true,
  setupFiles: ["@tumiki/vitest-config/setup"],
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
