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

    test("error.dataがない場合は全体がTOON変換される", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");
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

    test("配列はTOON変換される", () => {
      const input = JSON.stringify([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");
    });
  });

  describe("空文字列とnull文字列の処理", () => {
    test("空文字列は変換しない", () => {
      const result = convertMcpResponseToToon("");

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("");
    });

    test("'null'文字列はTOON変換される", () => {
      const result = convertMcpResponseToToon("null");

      expect(result.wasConverted).toBe(true);
    });
  });

  describe("MCP tools/call レスポンスの変換", () => {
    test("content[].text のJSON文字列をTOON変換する", () => {
      const teamsData = [
        { id: "team-1", name: "Developers", icon: "GitHub" },
        { id: "team-2", name: "Designers", icon: "Figma" },
      ];
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(teamsData),
            },
          ],
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);

      // パースして構造を検証
      const parsed = JSON.parse(result.convertedData) as {
        jsonrpc: string;
        id: number;
        result: {
          content: Array<{ type: string; text: string }>;
        };
      };

      // JSON-RPC構造が維持されている
      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.id).toBe(1);

      // MCP result.content 配列構造が維持されている
      expect(Array.isArray(parsed.result.content)).toBe(true);
      expect(parsed.result.content).toHaveLength(1);
      expect(parsed.result.content[0].type).toBe("text");

      // text フィールドはTOON形式に変換されている（元のJSON文字列ではない）
      const convertedText = parsed.result.content[0].text;
      expect(typeof convertedText).toBe("string");
      // TOON形式はJSONとは異なる形式になるため、パースできない
      expect(() => JSON.parse(convertedText)).toThrow();
    });

    test("type が text 以外の content は変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              type: "image",
              data: "base64data",
              mimeType: "image/png",
            },
          ],
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);

      const parsed = JSON.parse(result.convertedData) as {
        result: {
          content: Array<{ type: string; data: string; mimeType: string }>;
        };
      };

      // image content はそのまま維持される
      expect(parsed.result.content[0].type).toBe("image");
      expect(parsed.result.content[0].data).toBe("base64data");
      expect(parsed.result.content[0].mimeType).toBe("image/png");
    });

    test("複数の content を持つレスポンスを変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            { type: "text", text: JSON.stringify({ key: "value" }) },
            { type: "image", data: "base64", mimeType: "image/png" },
            { type: "text", text: "plain text" },
          ],
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);

      const parsed = JSON.parse(result.convertedData) as {
        result: {
          content: Array<{ type: string; text?: string; data?: string }>;
        };
      };

      expect(parsed.result.content).toHaveLength(3);
      // 最初のtext contentはTOON変換されている
      expect(typeof parsed.result.content[0].text).toBe("string");
      // image contentはそのまま
      expect(parsed.result.content[1].type).toBe("image");
      expect(parsed.result.content[1].data).toBe("base64");
      // 2番目のtext contentもTOON変換されている
      expect(typeof parsed.result.content[2].text).toBe("string");
    });

    test("content配列がない場合はresult全体をTOON変換する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: { key: "value" },
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);

      const parsed = JSON.parse(result.convertedData) as {
        jsonrpc: string;
        id: number;
        result: string; // result全体がTOON文字列に変換される
      };

      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.id).toBe(1);
      expect(typeof parsed.result).toBe("string");
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

  test("'null'文字列はTOON変換される", () => {
    const result = convertMcpResponseToToonSafe("null");

    expect(result.wasConverted).toBe(true);
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
