import { vi } from "vitest";

// テスト実行前に必要な環境変数を設定
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-for-nextauth-testing-only");
vi.stubEnv(
  "REDIS_ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
);
