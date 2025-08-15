import { config } from "dotenv";
import { resolve } from "path";
import { beforeAll, vi } from "vitest";

// Mock @tumiki/db before any imports
vi.mock("@tumiki/db/tcp", () => ({
  db: {
    userMcpServerInstance: {
      findUnique: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock @tumiki/db default export
vi.mock("@tumiki/db", () => ({
  TransportType: {
    SSE: "SSE",
    STREAMABLE_HTTPS: "STREAMABLE_HTTPS",
  },
}));

// Load test environment variables
beforeAll(() => {
  config({ path: resolve(__dirname, "../../.env.test") });
});
