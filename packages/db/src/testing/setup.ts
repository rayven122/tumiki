import { vi } from "vitest";

import { initialize } from "../../prisma/generated/fabbrica/index.js";

vi.mock("../wsClient.js", () => ({
  db: vPrisma.client,
}));

vi.mock("../server.js", () => ({
  db: vPrisma.client,
}));

initialize({
  prisma: () => vPrisma.client,
});
