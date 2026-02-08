import { describe, test, expect, vi, beforeEach } from "vitest";
import type { Context, Next } from "hono";
import { PiiMaskingMode } from "@tumiki/db/server";
import type { HonoEnv } from "../../../../../shared/types/honoEnv.js";
import { piiMaskingMiddleware } from "../index.js";

// 実行コンテキストをモック
const mockUpdateExecutionContext = vi.fn();

vi.mock("../../requestLogging/context.js", () => ({
  updateExecutionContext: (updates: unknown): void => {
    mockUpdateExecutionContext(updates);
  },
}));

// モックコンテキストを作成するヘルパー
const createMockContext = (): Context<HonoEnv> => {
  return {
    get: vi.fn(),
    set: vi.fn(),
    req: {
      text: vi.fn(),
    },
  } as unknown as Context<HonoEnv>;
};

describe("piiMaskingMiddleware (CE版)", () => {
  const mockNext: Next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("next() を呼び出す", async () => {
    const c = createMockContext();

    await piiMaskingMiddleware(c, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  test("piiMaskingMode=DISABLED を実行コンテキストに設定する", async () => {
    const c = createMockContext();

    await piiMaskingMiddleware(c, mockNext);

    expect(mockUpdateExecutionContext).toHaveBeenCalledWith({
      piiMaskingMode: PiiMaskingMode.DISABLED,
    });
  });

  test("next() の前に piiMaskingMode を設定する", async () => {
    const callOrder: string[] = [];

    const mockNextWithTracking: Next = vi.fn().mockImplementation(async () => {
      callOrder.push("next");
    });

    const mockUpdateWithTracking =
      mockUpdateExecutionContext.mockImplementation(() => {
        callOrder.push("updateExecutionContext");
      });

    const c = createMockContext();

    await piiMaskingMiddleware(c, mockNextWithTracking);

    // updateExecutionContext が next() より先に呼ばれることを確認
    expect(callOrder).toStrictEqual(["updateExecutionContext", "next"]);

    mockUpdateWithTracking.mockReset();
  });
});
