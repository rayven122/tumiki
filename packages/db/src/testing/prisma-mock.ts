import type { PrismaClient } from "@prisma/client";
import { createPrismaMock } from "bun-mock-prisma";
import { mock } from "bun:test";

const mockPrismaClient = createPrismaMock<PrismaClient>();

await mock.module("../client.js", () => ({
  __esModule: true,
  prisma: mockPrismaClient,
}));

export const prismaMock = mockPrismaClient;

export const resetPrismaMock = () => {
  prismaMock._reset();
};
