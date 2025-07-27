import type { PrismaClient } from "@prisma/client";
import { createPrismaMock } from "bun-mock-prisma";
import { mock } from "bun:test";

const mockPrismaClient = createPrismaMock<PrismaClient>();

await mock.module("../tcpClient.js", () => ({
  __esModule: true,
  db: mockPrismaClient,
}));

await mock.module("../wsClient.js", () => ({
  __esModule: true,
  db: mockPrismaClient,
}));

export const prismaMock = mockPrismaClient;

export const resetPrismaMock = () => {
  prismaMock._reset();
};
