import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import nodeCrypto from "node:crypto";

expect.extend(matchers);

// cryptoモジュールをグローバルに設定（prisma-field-encryptionがcryptoを必要とするため）
// Node.jsのcryptoモジュール全体をglobalThis.cryptoとして設定
Object.defineProperty(globalThis, "crypto", {
  value: nodeCrypto,
  writable: true,
  configurable: true,
});

// prisma-field-encryptionのモック（cryptoモジュールへの依存を回避）
vi.mock("prisma-field-encryption", () => ({
  fieldEncryptionExtension: () => ({}),
  fieldEncryptionMiddleware: () => ({}),
}));

// server-onlyモジュールのモック（テスト環境でClient Componentをテストできるようにする）
vi.mock("server-only", () => ({}));

// テスト実行前に必要な環境変数を設定
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-for-nextauth-testing-only");
vi.stubEnv(
  "REDIS_ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
);
