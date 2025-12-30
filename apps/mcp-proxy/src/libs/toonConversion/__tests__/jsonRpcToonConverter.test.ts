import { describe, expect, test } from "vitest";

import {
  convertMcpResponseToToon,
  convertMcpResponseToToonSafe,
} from "../jsonRpcToonConverter.js";

describe("convertMcpResponseToToon", () => {
  describe("JSON-RPC成功レスポンスの変換", () => {
    test("resultをTOON形式に変換する", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        result: { users: [{ id: 1, name: "Alice" }] },
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(result.convertedData).toHaveProperty("jsonrpc", "2.0");
      expect(result.convertedData).toHaveProperty("id", 1);
      expect(result.convertedData).toHaveProperty("result");
      // resultはTOON文字列に変換される
      expect(typeof (result.convertedData as { result: unknown }).result).toBe(
        "string",
      );
    });

    test("配列のresultをTOON形式に変換する", () => {
      const input = {
        jsonrpc: "2.0",
        id: "test-id",
        result: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob", role: "user" },
          { id: 3, name: "Charlie", role: "user" },
        ],
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(result.originalBytes).toBeGreaterThan(0);
      expect(result.convertedBytes).toBeGreaterThan(0);
    });

    test("空のresultを変換する", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        result: {},
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
    });

    test("nullのresultを変換する", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        result: null,
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
    });
  });

  describe("JSON-RPCエラーレスポンスの変換", () => {
    test("error.dataをTOON形式に変換する", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: { details: [{ field: "name", error: "required" }] },
        },
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      const converted = result.convertedData as {
        error: { code: number; message: string; data: unknown };
      };
      expect(converted.error.code).toBe(-32600);
      expect(converted.error.message).toBe("Invalid Request");
      // dataはTOON文字列に変換される
      expect(typeof converted.error.data).toBe("string");
    });

    test("error.dataがない場合は変換しない", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toStrictEqual(input);
    });
  });

  describe("非JSON-RPCデータの変換", () => {
    test("JSON-RPC形式でないオブジェクトは全体をTOON変換する", () => {
      const input = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      };

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      // 全体がTOON文字列に変換される
      expect(typeof result.convertedData).toBe("string");
    });

    test("配列はJSON-RPCバッチとして扱われ、変換されない", () => {
      const input = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      const result = convertMcpResponseToToon(input);

      // JSON-RPCバッチはサポートしていないため、変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toStrictEqual(input);
    });
  });

  describe("null/undefinedの処理", () => {
    test("nullは変換しない", () => {
      const result = convertMcpResponseToToon(null);

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(null);
    });

    test("undefinedは変換しない", () => {
      const result = convertMcpResponseToToon(undefined);

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(undefined);
    });
  });

  describe("プリミティブ型の処理", () => {
    test("文字列は変換しない", () => {
      const result = convertMcpResponseToToon("hello");

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("hello");
    });

    test("数値は変換しない", () => {
      const result = convertMcpResponseToToon(42);

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(42);
    });

    test("ブール値は変換しない", () => {
      const result = convertMcpResponseToToon(true);

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(true);
    });
  });

  describe("圧縮メトリクスの計算", () => {
    test("圧縮メトリクスが正しく計算される", () => {
      const input = {
        jsonrpc: "2.0",
        id: 1,
        result: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob", role: "user" },
          { id: 3, name: "Charlie", role: "user" },
        ],
      };

      const result = convertMcpResponseToToon(input);

      expect(result.originalBytes).toBeGreaterThan(0);
      expect(result.convertedBytes).toBeGreaterThan(0);
    });
  });
});

describe("convertMcpResponseToToonSafe", () => {
  test("正常なデータはTOON変換される", () => {
    const input = {
      jsonrpc: "2.0",
      id: 1,
      result: { data: "test" },
    };

    const result = convertMcpResponseToToonSafe(input);

    expect(result.wasConverted).toBe(true);
  });

  test("nullは変換されずに返される", () => {
    const result = convertMcpResponseToToonSafe(null);

    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe(null);
  });
});
