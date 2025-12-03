import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import nodeCrypto from "node:crypto";
import {
  TextEncoder as NodeTextEncoder,
  TextDecoder as NodeTextDecoder,
} from "node:util";

// TextEncoder/TextDecoderをグローバルに設定（joseライブラリが必要とするため）
// ※必ずimport直後に設定すること
globalThis.TextEncoder = NodeTextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = NodeTextDecoder as typeof globalThis.TextDecoder;

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

// next/serverのモック（next-authが内部で使用するため）
vi.mock("next/server", () => {
  class MockNextRequest {
    constructor(
      public url = "http://localhost:3000",
      public init?: RequestInit,
    ) {}
    headers = new Map();
    cookies = new Map();
    nextUrl = {
      pathname: "/",
      searchParams: new URLSearchParams(),
    };
  }

  class MockNextResponse {
    constructor(
      public body?: BodyInit | null,
      public init?: ResponseInit,
    ) {}

    static json(data: unknown, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: {
          ...init?.headers,
          "Content-Type": "application/json",
        },
      });
    }

    static redirect(url: string, status?: number) {
      return new MockNextResponse(null, {
        status: status ?? 307,
        headers: {
          Location: url,
        },
      });
    }

    static next(init?: ResponseInit) {
      return new MockNextResponse(null, init);
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
    userAgent: () => ({ isBot: false }),
  };
});

// テスト実行前に必要な環境変数を設定
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-for-nextauth-testing-only");
vi.stubEnv(
  "REDIS_ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
);
vi.stubEnv(
  "CACHE_ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
);
vi.stubEnv("KEYCLOAK_CLIENT_ID", "test-client-id");
vi.stubEnv("KEYCLOAK_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("KEYCLOAK_ISSUER", "https://test-keycloak.example.com/realms/test");
