import { afterEach, beforeEach, vi } from "vitest";

// グローバルモックの設定
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

// テスト環境のセットアップ
beforeEach(() => {
  // 各テスト前の共通セットアップ
  vi.clearAllMocks();
});

afterEach(() => {
  // 各テスト後のクリーンアップ
  vi.restoreAllMocks();
});

// 環境変数のモック
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv(
  "DATABASE_URL",
  "postgresql://root:password@localhost:5435/tumiki_test",
);
vi.stubEnv("API_KEY_PREFIX", "test_");
vi.stubEnv("API_KEY_LENGTH", "32");
vi.stubEnv(
  "PRISMA_FIELD_ENCRYPTION_KEY",
  "k1.aesgcm256.FkhfY-sKgaYBJYteXBGudV6g_oBOW1TjU74hbowUl8s=",
);

// グローバルに利用可能なテストユーティリティ
global.testUtils = {
  waitFor: (condition: () => boolean, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error("Timeout waiting for condition"));
        }
      }, 50);
    });
  },
};

// TypeScriptの型定義
declare global {
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
  };
}
