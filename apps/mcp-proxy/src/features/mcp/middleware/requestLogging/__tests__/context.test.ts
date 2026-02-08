import { describe, test, expect } from "vitest";
import { PiiMaskingMode } from "@tumiki/db/server";
import {
  getExecutionContext,
  updateExecutionContext,
  runWithExecutionContext,
  type McpExecutionContext,
} from "../context.js";

describe("getExecutionContext", () => {
  test("コンテキスト外で呼び出すとundefinedを返す", () => {
    const result = getExecutionContext();
    expect(result).toBeUndefined();
  });

  test("runWithExecutionContext内で呼び出すとコンテキストを返す", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      const result = getExecutionContext();
      expect(result).toStrictEqual(initialContext);
    });
  });
});

describe("updateExecutionContext", () => {
  test("コンテキスト外で呼び出しても例外を投げない", () => {
    // コンテキストがない場合は何もしない
    expect(() => {
      updateExecutionContext({ toolName: "test-tool" });
    }).not.toThrow();
  });

  test("コンテキスト内で部分的に更新できる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: 1234567890,
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      // 部分更新
      updateExecutionContext({
        toolName: "test-tool",
        httpStatus: 200,
      });

      const result = getExecutionContext();
      expect(result).toStrictEqual({
        requestStartTime: 1234567890,
        inputBytes: 100,
        toolName: "test-tool",
        httpStatus: 200,
      });
    });
  });

  test("複数回の更新が累積される", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: 1234567890,
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({ toolName: "first-tool" });
      updateExecutionContext({ method: "tools/call" });
      updateExecutionContext({ httpStatus: 200 });

      const result = getExecutionContext();
      expect(result).toStrictEqual({
        requestStartTime: 1234567890,
        inputBytes: 100,
        toolName: "first-tool",
        method: "tools/call",
        httpStatus: 200,
      });
    });
  });

  test("既存のプロパティを上書きできる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: 1234567890,
      inputBytes: 100,
      toolName: "old-tool",
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({ toolName: "new-tool" });

      const result = getExecutionContext();
      expect(result?.toolName).toBe("new-tool");
    });
  });

  test("PII検出情報を更新できる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({
        piiMaskingMode: PiiMaskingMode.BOTH,
        piiInfoTypes: ["EMAIL_ADDRESS", "PHONE_NUMBER"],
        piiDetectedRequest: [
          { infoType: "EMAIL_ADDRESS", count: 2 },
          { infoType: "PHONE_NUMBER", count: 1 },
        ],
      });

      const result = getExecutionContext();
      expect(result?.piiMaskingMode).toBe(PiiMaskingMode.BOTH);
      expect(result?.piiInfoTypes).toStrictEqual([
        "EMAIL_ADDRESS",
        "PHONE_NUMBER",
      ]);
      expect(result?.piiDetectedRequest).toStrictEqual([
        { infoType: "EMAIL_ADDRESS", count: 2 },
        { infoType: "PHONE_NUMBER", count: 1 },
      ]);
    });
  });

  test("TOON変換メトリクスを更新できる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({
        toonConversionEnabled: true,
        inputTokens: 1000,
        outputTokens: 500,
      });

      const result = getExecutionContext();
      expect(result?.toonConversionEnabled).toBe(true);
      expect(result?.inputTokens).toBe(1000);
      expect(result?.outputTokens).toBe(500);
    });
  });
});

describe("runWithExecutionContext", () => {
  test("コールバックの戻り値を返す", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    const result = await runWithExecutionContext(initialContext, async () => {
      return "callback result";
    });

    expect(result).toBe("callback result");
  });

  test("コールバック内で例外が発生した場合は伝播する", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    await expect(
      runWithExecutionContext(initialContext, async () => {
        throw new Error("Test error");
      }),
    ).rejects.toThrow("Test error");
  });

  test("ネストした呼び出しでは内側のコンテキストが優先される", async () => {
    const outerContext: McpExecutionContext = {
      requestStartTime: 1000,
      inputBytes: 100,
      toolName: "outer-tool",
    };

    const innerContext: McpExecutionContext = {
      requestStartTime: 2000,
      inputBytes: 200,
      toolName: "inner-tool",
    };

    await runWithExecutionContext(outerContext, async () => {
      // 外側のコンテキストを確認
      expect(getExecutionContext()?.toolName).toBe("outer-tool");

      await runWithExecutionContext(innerContext, async () => {
        // 内側のコンテキストを確認
        expect(getExecutionContext()?.toolName).toBe("inner-tool");
        expect(getExecutionContext()?.requestStartTime).toBe(2000);
      });

      // 外側に戻ったことを確認
      expect(getExecutionContext()?.toolName).toBe("outer-tool");
    });
  });

  test("コンテキストは非同期操作を跨いで保持される", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
      toolName: "async-tool",
    };

    await runWithExecutionContext(initialContext, async () => {
      // 非同期操作をシミュレート
      await new Promise((resolve) => setTimeout(resolve, 10));

      // コンテキストがまだ保持されていることを確認
      const result = getExecutionContext();
      expect(result?.toolName).toBe("async-tool");
    });
  });

  test("並行リクエストでコンテキストが分離される", async () => {
    const context1: McpExecutionContext = {
      requestStartTime: 1000,
      inputBytes: 100,
      toolName: "request-1",
    };

    const context2: McpExecutionContext = {
      requestStartTime: 2000,
      inputBytes: 200,
      toolName: "request-2",
    };

    const results: (string | undefined)[] = [];

    await Promise.all([
      runWithExecutionContext(context1, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        results.push(getExecutionContext()?.toolName);
      }),
      runWithExecutionContext(context2, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(getExecutionContext()?.toolName);
      }),
    ]);

    // 各コンテキストが分離されていることを確認
    expect(results).toContain("request-1");
    expect(results).toContain("request-2");
  });
});

describe("エラー情報の管理", () => {
  test("エラー情報を設定できる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({
        errorCode: -32600,
        errorMessage: "Invalid Request",
        errorDetails: { field: "params", reason: "missing" },
      });

      const result = getExecutionContext();
      expect(result?.errorCode).toBe(-32600);
      expect(result?.errorMessage).toBe("Invalid Request");
      expect(result?.errorDetails).toStrictEqual({
        field: "params",
        reason: "missing",
      });
    });
  });
});

describe("リクエストボディの管理", () => {
  test("リクエストボディを設定できる", async () => {
    const initialContext: McpExecutionContext = {
      requestStartTime: Date.now(),
      inputBytes: 100,
    };

    const requestBody = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "test-tool" },
      id: 1,
    };

    await runWithExecutionContext(initialContext, async () => {
      updateExecutionContext({ requestBody });

      const result = getExecutionContext();
      expect(result?.requestBody).toStrictEqual(requestBody);
    });
  });
});
