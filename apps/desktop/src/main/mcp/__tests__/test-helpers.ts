import { vi } from "vitest";
import type { Logger } from "../types";

export const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
});
