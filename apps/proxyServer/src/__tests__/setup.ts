import { config } from "dotenv";
import { resolve } from "path";

// より具体的なモック型定義
type MockDatabaseMethod = ReturnType<typeof vi.fn>;

type MockDatabase = {
  userMcpServerInstance: {
    findUnique: MockDatabaseMethod;
    findMany: MockDatabaseMethod;
    create: MockDatabaseMethod;
    update: MockDatabaseMethod;
    delete: MockDatabaseMethod;
  };
  apiKey: {
    findUnique: MockDatabaseMethod;
    findMany: MockDatabaseMethod;
    create: MockDatabaseMethod;
    update: MockDatabaseMethod;
    delete: MockDatabaseMethod;
  };
  organization: {
    findUnique: MockDatabaseMethod;
    findMany: MockDatabaseMethod;
  };
};

// 型安全なモックデータベースの作成
const createMockDatabase = (): MockDatabase => ({
  userMcpServerInstance: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
});

// Mock @tumiki/db before any imports
vi.mock("@tumiki/db/tcp", () => ({
  db: createMockDatabase(),
}));

// Mock @tumiki/db default export
vi.mock("@tumiki/db", () => ({
  TransportType: {
    SSE: "SSE",
    STREAMABLE_HTTPS: "STREAMABLE_HTTPS",
  },
  // 他の必要な型やenumもここに追加
  McpServerStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    ERROR: "ERROR",
  },
}));

// Load test environment variables
beforeAll(() => {
  config({ path: resolve(__dirname, "../../.env.test") });

  // テスト用のデフォルト環境変数設定
  if (!process.env.TEST_TIMEOUT) {
    process.env.TEST_TIMEOUT = "5000";
  }

  if (!process.env.TEST_API_KEY) {
    process.env.TEST_API_KEY = "test-api-key-123";
  }
});

// テスト用のヘルパー関数をエクスポート
export { createMockDatabase };
export type { MockDatabase, MockDatabaseMethod };

// グローバルなテストユーティリティ
export const testUtils = {
  createMockAuthInfo: (overrides = {}) => ({
    type: "api_key" as const,
    userMcpServerInstanceId: "test-server-123",
    organizationId: "org-test-123",
    ...overrides,
  }),

  createMockJsonRpcRequest: (
    method: string,
    params?: unknown,
    id?: unknown,
  ) => ({
    jsonrpc: "2.0" as const,
    method,
    params,
    id: id ?? 1,
  }),

  createMockJsonRpcResponse: (
    result?: unknown,
    error?: unknown,
    id?: unknown,
  ) => ({
    jsonrpc: "2.0" as const,
    ...(result !== undefined && { result }),
    ...(error !== undefined && { error }),
    id: id ?? 1,
  }),
};
