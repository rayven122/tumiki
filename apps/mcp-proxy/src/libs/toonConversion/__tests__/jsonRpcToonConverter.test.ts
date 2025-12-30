import { describe, expect, test } from "vitest";

import {
  convertMcpResponseToToon,
  convertMcpResponseToToonSafe,
} from "../jsonRpcToonConverter.js";

describe("convertMcpResponseToToon", () => {
  describe("JSON-RPC成功レスポンスの変換", () => {
    test("resultをTOON形式に変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { users: [{ id: 1, name: "Alice" }] },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");

      // JSON文字列をパースして検証
      const parsed = JSON.parse(result.convertedData) as {
        jsonrpc: string;
        id: number;
        result: unknown;
      };
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.id).toBe(1);
      // resultはTOON文字列に変換される
      expect(typeof parsed.result).toBe("string");
    });

    test("配列のresultをTOON形式に変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: "test-id",
        result: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob", role: "user" },
          { id: 3, name: "Charlie", role: "user" },
        ],
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(result.originalBytes).toBeGreaterThan(0);
      expect(result.convertedBytes).toBeGreaterThan(0);
    });

    test("空のresultを変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {},
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
    });

    test("nullのresultを変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: null,
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
    });
  });

  describe("JSON-RPCエラーレスポンスの変換", () => {
    test("error.dataをTOON形式に変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: { details: [{ field: "name", error: "required" }] },
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");

      // JSON文字列をパースして検証
      const parsed = JSON.parse(result.convertedData) as {
        error: { code: number; message: string; data: unknown };
      };
      expect(parsed.error.code).toBe(-32600);
      expect(parsed.error.message).toBe("Invalid Request");
      // dataはTOON文字列に変換される
      expect(typeof parsed.error.data).toBe("string");
    });

    test("error.dataがない場合は変換しない", () => {
      const inputObj = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      };
      const input = JSON.stringify(inputObj);

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(false);
      // 変換なしの場合は元のJSON文字列が返される
      expect(result.convertedData).toBe(input);
    });
  });

  describe("非JSON-RPCデータの変換", () => {
    test("JSON-RPC形式でないオブジェクトは全体をTOON変換する", () => {
      const input = JSON.stringify({
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      // 全体がTOON文字列に変換される
      expect(typeof result.convertedData).toBe("string");
    });

    test("配列はJSON-RPCバッチとして扱われ、変換されない", () => {
      const input = JSON.stringify([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);

      const result = convertMcpResponseToToon(input);

      // JSON-RPCバッチはサポートしていないため、変換されない
      expect(result.wasConverted).toBe(false);
      // 変換なしの場合は元のJSON文字列が返される
      expect(result.convertedData).toBe(input);
    });
  });

  describe("空文字列とnull文字列の処理", () => {
    test("空文字列は変換しない", () => {
      const result = convertMcpResponseToToon("");

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("");
    });

    test("'null'文字列は変換しない", () => {
      const result = convertMcpResponseToToon("null");

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("null");
    });
  });

  describe("圧縮メトリクスの計算", () => {
    test("圧縮メトリクスが正しく計算される", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: [
          { id: 1, name: "Alice", role: "admin" },
          { id: 2, name: "Bob", role: "user" },
          { id: 3, name: "Charlie", role: "user" },
        ],
      });

      const result = convertMcpResponseToToon(input);

      expect(result.originalBytes).toBeGreaterThan(0);
      expect(result.convertedBytes).toBeGreaterThan(0);
    });
  });
});

describe("convertMcpResponseToToonSafe", () => {
  test("正常なデータはTOON変換される", () => {
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { data: "test" },
    });

    const result = convertMcpResponseToToonSafe(input);

    expect(result.wasConverted).toBe(true);
  });

  test("'null'文字列は変換されずに返される", () => {
    const result = convertMcpResponseToToonSafe("null");

    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe("null");
  });

  test("不正なJSON文字列はエラー時にフォールバックする", () => {
    const invalidJson = "{ invalid json }";

    const result = convertMcpResponseToToonSafe(invalidJson);

    // フェイルオープンで元データが返される
    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe(invalidJson);
    expect(result.originalBytes).toBeGreaterThan(0);
  });
});
