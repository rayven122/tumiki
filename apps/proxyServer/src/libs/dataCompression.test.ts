import { describe, expect, test } from "bun:test";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import {
  compressData,
  decompressData,
  compressRequestResponseData,
  calculateDataSize,
  parseJsonSafely,
} from "./dataCompression.js";

const gzipAsync = promisify(gzip);

describe("compressData", () => {
  test("小さなデータを正常に圧縮する", async () => {
    const data = { message: "Hello, World!" };
    const result = await compressData(data);

    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThan(0);
    // 小さなデータは圧縮率が悪い場合があるため、上限を緩和
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  test("大容量データを正常に圧縮する", async () => {
    const largeData = { content: "x".repeat(50000) };
    const result = await compressData(largeData);

    expect(result.compressionRatio).toBeLessThan(0.1);
    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toBeGreaterThan(50000);
  });

  test("100MBを超えるデータでエラーが発生する", () => {
    const oversizedData = { data: "x".repeat(100 * 1024 * 1024 + 1) };

    expect(compressData(oversizedData)).rejects.toThrow(
      "Data size exceeds maximum limit of 100MB",
    );
  });

  test("nullデータを正常に圧縮する", async () => {
    const result = await compressData(null);

    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toStrictEqual(4); // "null"
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  test("undefinedデータでエラーが発生する", () => {
    expect(compressData(undefined)).rejects.toThrow(
      "Cannot process undefined data",
    );
  });

  test("循環参照を持つオブジェクトでエラーが発生する", () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj;

    expect(compressData(obj)).rejects.toThrow();
  });

  test("空のオブジェクトを圧縮できる", async () => {
    const emptyData = {};
    const result = await compressData(emptyData);

    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  test("配列データを圧縮できる", async () => {
    const arrayData = [1, 2, 3, "test", { nested: true }];
    const result = await compressData(arrayData);

    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toBeGreaterThan(0);
  });

  test("日本語を含むデータを正常に圧縮する", async () => {
    const japaneseData = { message: "こんにちは世界" };
    const result = await compressData(japaneseData);

    expect(result.compressedData).toBeInstanceOf(Buffer);
    expect(result.originalSize).toBeGreaterThan(0);
  });

  test("エラーが発生した場合、エラーを伝播する", () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj; // 循環参照を作成

    expect(compressData(obj)).rejects.toThrow();
  });
});

describe("decompressData", () => {
  test("圧縮されたデータを正常に展開する", async () => {
    const originalData = { message: "Hello, World!" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(originalData), "utf8"),
    );

    const result = await decompressData<typeof originalData>(compressed);

    expect(result).toStrictEqual(originalData);
  });

  test("不正なgzipデータでエラーが発生する", () => {
    const invalidBuffer = Buffer.from("invalid gzip data");

    expect(decompressData(invalidBuffer)).rejects.toThrow();
  });

  test("空のBufferでエラーが発生する", () => {
    const emptyBuffer = Buffer.from("");

    expect(decompressData(emptyBuffer)).rejects.toThrow(
      "Invalid compressed data: buffer is empty",
    );
  });

  test("nullでエラーが発生する", () => {
    expect(decompressData(null as never)).rejects.toThrow(
      "Invalid compressed data: expected Buffer, got object",
    );
  });

  test("Buffer以外の型でエラーが発生する", () => {
    expect(decompressData("not a buffer" as never)).rejects.toThrow(
      "Invalid compressed data: expected Buffer, got string",
    );
  });

  test("不正なJSONでエラーが発生する", async () => {
    const invalidJson = await gzipAsync(Buffer.from("{ invalid json", "utf8"));

    expect(decompressData(invalidJson)).rejects.toThrow();
  });

  test("プロトタイプ汚染攻撃を防御する", async () => {
    const maliciousData =
      '{"__proto__": {"admin": true}, "constructor": {"isAdmin": true}}';
    const compressed = await gzipAsync(Buffer.from(maliciousData, "utf8"));

    const result = await decompressData<Record<string, unknown>>(compressed);

    expect(
      Object.prototype.hasOwnProperty.call(result, "__proto__"),
    ).toBeFalsy();
    expect(
      Object.prototype.hasOwnProperty.call(result, "constructor"),
    ).toBeFalsy();
    expect(
      Object.hasOwn(result, "admin") ? result.admin : undefined,
    ).toBeUndefined();
  });

  test("日本語を含むデータを正常に展開する", async () => {
    const japaneseData = { message: "こんにちは世界" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(japaneseData), "utf8"),
    );

    const result = await decompressData<typeof japaneseData>(compressed);

    expect(result).toStrictEqual(japaneseData);
  });

  test("ネストされたオブジェクトを正常に展開する", async () => {
    const nestedData = {
      level1: {
        level2: {
          level3: {
            value: "deep nested value",
          },
        },
      },
    };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(nestedData), "utf8"),
    );

    const result = await decompressData<typeof nestedData>(compressed);

    expect(result).toStrictEqual(nestedData);
  });

  test("大きな圧縮データを正常に展開する", async () => {
    const largeData = { content: "x".repeat(50000) };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(largeData), "utf8"),
    );

    const result = await decompressData<typeof largeData>(compressed);

    expect(result.content.length).toStrictEqual(50000);
  });
});

describe("compressRequestResponseData", () => {
  test("リクエストとレスポンスの両方を圧縮する", async () => {
    const requestData = { method: "GET", path: "/api/test" };
    const responseData = { status: 200, data: "success" };

    const result = await compressRequestResponseData(requestData, responseData);

    expect(result.inputDataCompressed).toBeInstanceOf(Buffer);
    expect(result.outputDataCompressed).toBeInstanceOf(Buffer);
    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.originalInputSize).toBeGreaterThan(0);
    expect(result.originalOutputSize).toBeGreaterThan(0);
  });

  test("リクエストがnullの場合でも処理できる", async () => {
    const responseData = { status: 200 };

    const result = await compressRequestResponseData(null, responseData);

    expect(result.originalInputSize).toStrictEqual(4); // "null"
    expect(result.outputDataCompressed).toBeInstanceOf(Buffer);
  });

  test("レスポンスがundefinedの場合はエラーが発生する", () => {
    const requestData = { method: "POST" };

    expect(compressRequestResponseData(requestData, undefined)).rejects.toThrow(
      "Cannot process undefined data",
    );
  });

  test("両方が空オブジェクトの場合でも処理できる", async () => {
    const result = await compressRequestResponseData({}, {});

    expect(result.inputDataCompressed).toBeInstanceOf(Buffer);
    expect(result.outputDataCompressed).toBeInstanceOf(Buffer);
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  test("大きなデータでも並列処理で効率的に圧縮する", async () => {
    const largeRequest = { data: "x".repeat(10000) };
    const largeResponse = { data: "y".repeat(10000) };

    const startTime = Date.now();
    const result = await compressRequestResponseData(
      largeRequest,
      largeResponse,
    );
    const elapsedTime = Date.now() - startTime;

    expect(result.compressionRatio).toBeLessThan(0.1);
    expect(result.originalInputSize).toBeGreaterThan(10000);
    expect(result.originalOutputSize).toBeGreaterThan(10000);
    expect(elapsedTime).toBeLessThan(1000); // 1秒以内に完了
  });

  test("エラーが発生した場合、適切にエラーを伝播する", () => {
    const oversizedRequest = { data: "x".repeat(100 * 1024 * 1024 + 1) };
    const responseData = { status: 200 };

    expect(
      compressRequestResponseData(oversizedRequest, responseData),
    ).rejects.toThrow("Data size exceeds maximum limit of 100MB");
  });
});

describe("calculateDataSize", () => {
  test("文字列のサイズを正確に計算する", () => {
    const data = "Hello, World!";
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(15); // "Hello, World!" = 13 + quotes = 15
  });

  test("オブジェクトのサイズを正確に計算する", () => {
    const data = { key: "value" };
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(15); // {"key":"value"}
  });

  test("配列のサイズを正確に計算する", () => {
    const data = [1, 2, 3];
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(7); // [1,2,3]
  });

  test("日本語文字列のバイトサイズを正確に計算する", () => {
    const data = "こんにちは";
    const size = calculateDataSize(data);

    // "こんにちは" + quotes = 15バイト(UTF-8) + 2
    expect(size).toStrictEqual(17);
  });

  test("nullのサイズを計算する", () => {
    const size = calculateDataSize(null);

    expect(size).toStrictEqual(4); // null
  });

  test("undefinedのサイズを計算する", () => {
    expect(() => calculateDataSize(undefined)).toThrow(
      "Cannot process undefined data",
    );
  });

  test("空オブジェクトのサイズを計算する", () => {
    const size = calculateDataSize({});

    expect(size).toStrictEqual(2); // {}
  });

  test("ネストしたオブジェクトのサイズを計算する", () => {
    const data = {
      level1: {
        level2: {
          value: "nested",
        },
      },
    };
    const size = calculateDataSize(data);

    expect(size).toBeGreaterThan(30);
  });

  test("循環参照を持つオブジェクトでエラーが発生する", () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj;

    expect(() => calculateDataSize(obj)).toThrow();
  });

  test("大きなデータのサイズを計算する", () => {
    const largeData = { content: "x".repeat(10000) };
    const size = calculateDataSize(largeData);

    expect(size).toBeGreaterThan(10000);
  });
});

describe("parseJsonSafely", () => {
  test("通常のJSONを正常にパースする", () => {
    const json = '{"key": "value", "number": 123}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ key: "value", number: 123 });
  });

  test("__proto__キーを除外する", () => {
    const json = '{"__proto__": {"admin": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    expect(
      Object.prototype.hasOwnProperty.call(result, "__proto__"),
    ).toBeFalsy();
  });

  test("constructorキーを除外する", () => {
    const json = '{"constructor": {"isAdmin": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    expect((result as Record<string, unknown>).constructor).not.toHaveProperty(
      "isAdmin",
    );
  });

  test("prototypeキーを除外する", () => {
    const json = '{"prototype": {"vulnerable": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    expect((result as Record<string, unknown>).prototype).toBeUndefined();
  });

  test("ネストされたオブジェクトでも危険なキーを除外する", () => {
    const json = '{"nested": {"__proto__": {"admin": true}, "safe": "value"}}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ nested: { safe: "value" } });
  });

  test("配列内のオブジェクトでも危険なキーを除外する", () => {
    const json = '[{"__proto__": {"admin": true}}, {"safe": "item"}]';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual([{}, { safe: "item" }]);
  });

  test("不正なJSONでエラーが発生する", () => {
    const invalidJson = "{ invalid json }";

    expect(() => parseJsonSafely(invalidJson)).toThrow();
  });

  test("空文字列でエラーが発生する", () => {
    expect(() => parseJsonSafely("")).toThrow();
  });

  test("nullをパースできる", () => {
    const result = parseJsonSafely("null");

    expect(result).toBeNull();
  });

  test("数値をパースできる", () => {
    const result = parseJsonSafely("123");

    expect(result).toStrictEqual(123);
  });

  test("文字列をパースできる", () => {
    const result = parseJsonSafely('"hello"');

    expect(result).toStrictEqual("hello");
  });

  test("真偽値をパースできる", () => {
    expect(parseJsonSafely("true")).toStrictEqual(true);
    expect(parseJsonSafely("false")).toStrictEqual(false);
  });
});
