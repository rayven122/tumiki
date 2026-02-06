import { describe, expect, test } from "vitest";

import {
  convertMcpResponseToToon,
  convertMcpResponseToToonSafe,
} from "../jsonRpcToonConverter.js";

/**
 * 圧縮効率が良くなるような繰り返しパターンのあるテストデータを生成
 */
const createLargeUserArray = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i === 0 ? "admin" : "user",
    department: "Engineering",
    status: "active",
  }));

describe("convertMcpResponseToToon", () => {
  describe("JSON-RPC成功レスポンスの変換", () => {
    test("resultをTOON形式に変換する", () => {
      // 繰り返しパターンが多いデータで圧縮効率が良くなる
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { users: createLargeUserArray(5) },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);

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
        result: createLargeUserArray(5),
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);
    });

    test("空のresultはTOON変換される（圧縮効率が良い場合）", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {},
      });

      const result = convertMcpResponseToToon(input);

      // 空のオブジェクトはTOON形式で圧縮効率が良い場合がある
      // 結果は圧縮効率による
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
    });

    test("nullのresultは圧縮効率が良くないため変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: null,
      });

      const result = convertMcpResponseToToon(input);

      // nullは圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
    });
  });

  describe("JSON-RPCエラーレスポンスの変換", () => {
    test("error.dataをTOON形式に変換する", () => {
      // 繰り返しパターンが多いデータで圧縮効率が良くなる
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: {
            details: Array.from({ length: 10 }, (_, i) => ({
              field: `field${i}`,
              error: "required",
              code: "VALIDATION_ERROR",
              path: `/data/field${i}`,
            })),
          },
        },
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);

      // JSON文字列をパースして検証
      const parsed = JSON.parse(result.convertedData) as {
        error: { code: number; message: string; data: unknown };
      };
      expect(parsed.error.code).toBe(-32600);
      expect(parsed.error.message).toBe("Invalid Request");
      // dataはTOON文字列に変換される
      expect(typeof parsed.error.data).toBe("string");
    });

    test("error.dataがない場合で圧縮効率が良くないときは変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
        },
      });

      const result = convertMcpResponseToToon(input);

      // 短いデータは圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
    });
  });

  describe("非JSON-RPCデータの変換", () => {
    test("JSON-RPC形式でないオブジェクトは圧縮効率が良い場合TOON変換する", () => {
      const input = JSON.stringify({
        users: createLargeUserArray(5),
      });

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      // 全体がTOON文字列に変換される
      expect(typeof result.convertedData).toBe("string");
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);
    });

    test("配列は圧縮効率が良い場合TOON変換される", () => {
      const input = JSON.stringify(createLargeUserArray(5));

      const result = convertMcpResponseToToon(input);

      expect(result.wasConverted).toBe(true);
      expect(typeof result.convertedData).toBe("string");
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);
    });
  });

  describe("空文字列とnull文字列の処理", () => {
    test("空文字列は変換しない", () => {
      const result = convertMcpResponseToToon("");

      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("");
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });

    test("'null'文字列は圧縮効率が良くないため変換しない", () => {
      const result = convertMcpResponseToToon("null");

      // 非常に短いデータは圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe("null");
    });
  });

  describe("MCP tools/call レスポンスの変換", () => {
    test("content[].text のJSON文字列をTOON変換する", () => {
      const teamsData = Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i}`,
        icon: "GitHub",
        description: "Development team",
        memberCount: 10,
      }));
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
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);

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
      expect(() => {
        JSON.parse(convertedText);
      }).toThrow();
    });

    test("type が text 以外の content は変換されない（圧縮効率が良くない場合）", () => {
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

      // 短いデータは圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);

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

    test("複数の content を持つレスポンスを処理する", () => {
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

      // トークン数が計算される
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);

      // 変換されたかどうかに関係なく、結果は有効なJSONである
      const parsed = JSON.parse(result.convertedData) as {
        result: {
          content: Array<{ type: string; text?: string; data?: string }>;
        };
      };

      expect(parsed.result.content).toHaveLength(3);
      // image contentはそのまま維持される
      expect(parsed.result.content[1].type).toBe("image");
      expect(parsed.result.content[1].data).toBe("base64");
    });

    test("content配列がない場合で圧縮効率が良くないときは変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: { key: "value" },
        },
      });

      const result = convertMcpResponseToToon(input);

      // 短いデータは圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
    });

    test("content配列がないresultを処理する", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          data: { key: "value" },
        },
      });

      const result = convertMcpResponseToToon(input);

      // トークン数が計算される
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);

      // 変換されたかどうかに関係なく、結果は有効なJSONである
      const parsed = JSON.parse(result.convertedData) as {
        jsonrpc: string;
        id: number;
        result: unknown;
      };

      expect(parsed.jsonrpc).toBe("2.0");
      expect(parsed.id).toBe(1);
    });
  });

  describe("トークン数メトリクスの計算", () => {
    test("入力・出力トークン数が正しく計算される", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: createLargeUserArray(5),
      });

      const result = convertMcpResponseToToon(input);

      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
      expect(typeof result.inputTokens).toBe("number");
      expect(typeof result.outputTokens).toBe("number");
    });

    test("TOON変換により出力トークン数は入力より少なくなる", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: createLargeUserArray(5),
      });

      const result = convertMcpResponseToToon(input);

      // TOON変換によりトークン数が削減される
      expect(result.outputTokens).toBeLessThan(result.inputTokens);
    });
  });

  describe("圧縮効率が良くない場合の処理", () => {
    test("非常に短いデータは変換しない", () => {
      // 単純な短いデータは圧縮効率が良くないため変換されない
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: "OK",
      });

      const result = convertMcpResponseToToon(input);

      // 圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
      expect(result.inputTokens).toBe(result.outputTokens);
    });

    test("圧縮効率が良くないエラーレスポンスは変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -1,
          message: "Error",
          data: "x",
        },
      });

      const result = convertMcpResponseToToon(input);

      // 圧縮効率が良くない場合は元のデータを返す
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
    });

    test("圧縮効率が良くないMCPレスポンスは変換しない", () => {
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [
            {
              type: "text",
              text: "OK",
            },
          ],
        },
      });

      const result = convertMcpResponseToToon(input);

      // 圧縮効率が良くないため変換されない
      expect(result.wasConverted).toBe(false);
      expect(result.convertedData).toBe(input);
    });

    test("圧縮効率が良い場合は変換される", () => {
      // 繰り返しパターンが多いデータは圧縮効率が良い
      const input = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: createLargeUserArray(10),
      });

      const result = convertMcpResponseToToon(input);

      // 圧縮効率が良いため変換される
      expect(result.wasConverted).toBe(true);
      expect(result.outputTokens).toBeLessThan(result.inputTokens);
    });
  });
});

describe("convertMcpResponseToToonSafe", () => {
  test("圧縮効率が良いデータはTOON変換される", () => {
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { data: createLargeUserArray(5) },
    });

    const result = convertMcpResponseToToonSafe(input);

    expect(result.wasConverted).toBe(true);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeLessThan(result.inputTokens);
  });

  test("圧縮効率が良くないデータは変換されない", () => {
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { data: "test" },
    });

    const result = convertMcpResponseToToonSafe(input);

    // 短いデータは圧縮効率が良くないため変換されない
    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe(input);
  });

  test("'null'文字列は圧縮効率が良くないため変換しない", () => {
    const result = convertMcpResponseToToonSafe("null");

    // 非常に短いデータは圧縮効率が良くないため変換されない
    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe("null");
  });

  test("不正なJSON文字列はエラー時にフォールバックする", () => {
    const invalidJson = "{ invalid json }";

    const result = convertMcpResponseToToonSafe(invalidJson);

    // フェイルオープンで元データが返される
    expect(result.wasConverted).toBe(false);
    expect(result.convertedData).toBe(invalidJson);
    // エラー時も元データのトークン数が計算される（inputとoutputは同じ）
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.inputTokens).toBe(result.outputTokens);
  });
});
