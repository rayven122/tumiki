import { vi } from "vitest";

import { initialize } from "../../prisma/generated/fabbrica/index.js";

// vPrismaクライアント（トランザクション対応）をそのまま使用
// 拡張機能のテストは、後で適用されたクライアントを直接テストする

vi.mock("../wsClient.js", () => ({
  db: vPrisma.client,
}));

vi.mock("../server.js", () => ({
  db: vPrisma.client,
}));

initialize({
  prisma: () => vPrisma.client,
});
