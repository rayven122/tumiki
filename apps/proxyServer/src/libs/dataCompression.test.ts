import { describe, expect, test } from "vitest";
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
  test("正常系: 小さなデータを圧縮する", async () => {
    const data = { message: "Hello, World!" };
    const result = await compressData(data);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize > 0).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
    expect(result.compressionRatio <= 2).toStrictEqual(true); // 小さなデータは圧縮率が悪い
  });

  test("正常系: 大容量データを効率的に圧縮する", async () => {
    const largeData = { content: "x".repeat(50000) };
    const result = await compressData(largeData);

    expect(result.compressionRatio < 0.1).toStrictEqual(true);
    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize > 50000).toStrictEqual(true);
  });

  test("異常系: 100MBを超えるデータでエラーが発生する", async () => {
    const oversizedData = { data: "x".repeat(100 * 1024 * 1024 + 1) };

    await expect(compressData(oversizedData)).rejects.toThrow(
      "Data size exceeds maximum limit of 100MB",
    );
  });

  test("正常系: nullデータを圧縮する", async () => {
    const result = await compressData(null);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize).toStrictEqual(4); // "null"
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("異常系: undefinedデータでエラーが発生する", async () => {
    await expect(compressData(undefined)).rejects.toThrow(
      "Cannot process undefined data",
    );
  });

  test("異常系: 循環参照を持つオブジェクトでエラーが発生する", async () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj;

    await expect(compressData(obj)).rejects.toThrow();
  });

  test("正常系: 空のオブジェクトを圧縮する", async () => {
    const emptyData = {};
    const result = await compressData(emptyData);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize).toStrictEqual(2); // "{}"
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: 配列データを圧縮する", async () => {
    const arrayData = [1, 2, 3, "test", { nested: true }];
    const result = await compressData(arrayData);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize > 0).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: 日本語を含むデータを圧縮する", async () => {
    const japaneseData = { message: "こんにちは世界" };
    const result = await compressData(japaneseData);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize > 0).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: 数値データを圧縮する", async () => {
    const result = await compressData(12345);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize).toStrictEqual(5); // "12345"
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: 真偽値データを圧縮する", async () => {
    const result = await compressData(true);

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize).toStrictEqual(4); // "true"
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: 文字列データを圧縮する", async () => {
    const result = await compressData("simple string");

    expect(Buffer.isBuffer(result.compressedData)).toStrictEqual(true);
    expect(result.originalSize).toStrictEqual(15); // "\"simple string\""
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });
});

describe("decompressData", () => {
  test("正常系: 圧縮されたデータを展開する", async () => {
    const originalData = { message: "Hello, World!" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(originalData), "utf8"),
    );

    const result = await decompressData<typeof originalData>(compressed);

    expect(result).toStrictEqual(originalData);
  });

  test("異常系: 不正なgzipデータでエラーが発生する", async () => {
    const invalidBuffer = Buffer.from("invalid gzip data");

    await expect(decompressData(invalidBuffer)).rejects.toThrow();
  });

  test("異常系: 空のBufferでエラーが発生する", async () => {
    const emptyBuffer = Buffer.from("");

    await expect(decompressData(emptyBuffer)).rejects.toThrow(
      "Invalid compressed data: buffer is empty",
    );
  });

  test("異常系: nullでエラーが発生する", async () => {
    await expect(decompressData(null as never)).rejects.toThrow(
      "Invalid compressed data: expected Buffer, got object",
    );
  });

  test("異常系: Buffer以外の型でエラーが発生する", async () => {
    await expect(decompressData("not a buffer" as never)).rejects.toThrow(
      "Invalid compressed data: expected Buffer, got string",
    );
  });

  test("異常系: 配列でエラーが発生する", async () => {
    await expect(decompressData([1, 2, 3] as never)).rejects.toThrow(
      "Invalid compressed data: expected Buffer, got array",
    );
  });

  test("異常系: 不正なJSONでエラーが発生する", async () => {
    const invalidJson = await gzipAsync(Buffer.from("{ invalid json", "utf8"));

    await expect(decompressData(invalidJson)).rejects.toThrow();
  });

  test("異常系: JSON以外のフォーマットでエラーが発生する", async () => {
    const invalidFormat = await gzipAsync(Buffer.from("plain text", "utf8"));

    await expect(decompressData(invalidFormat)).rejects.toThrow(
      "Invalid JSON format: expected object or array",
    );
  });

  test("正常系: プロトタイプ汚染攻撃を防御する", async () => {
    const maliciousData =
      '{"__proto__": {"admin": true}, "constructor": {"isAdmin": true}}';
    const compressed = await gzipAsync(Buffer.from(maliciousData, "utf8"));

    const result = await decompressData<Record<string, unknown>>(compressed);

    expect(
      Object.prototype.hasOwnProperty.call(result, "__proto__"),
    ).toStrictEqual(false);
    expect(
      Object.prototype.hasOwnProperty.call(result, "constructor"),
    ).toStrictEqual(false);
    expect(
      Object.hasOwn(result, "admin") ? result.admin : undefined,
    ).toStrictEqual(undefined);
  });

  test("正常系: 日本語を含むデータを展開する", async () => {
    const japaneseData = { message: "こんにちは世界" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(japaneseData), "utf8"),
    );

    const result = await decompressData<typeof japaneseData>(compressed);

    expect(result).toStrictEqual(japaneseData);
  });

  test("正常系: ネストされたオブジェクトを展開する", async () => {
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

  test("正常系: 大きな圧縮データを展開する", async () => {
    const largeData = { content: "x".repeat(50000) };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(largeData), "utf8"),
    );

    const result = await decompressData<typeof largeData>(compressed);

    expect(result.content.length).toStrictEqual(50000);
  });

  test("正常系: 配列データを展開する", async () => {
    const arrayData = [1, 2, 3, "test", { nested: true }];
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(arrayData), "utf8"),
    );

    const result = await decompressData<typeof arrayData>(compressed);

    expect(result).toStrictEqual(arrayData);
  });

  test("正常系: バリデーター関数で型検証を行う", async () => {
    interface TestData {
      id: number;
      name: string;
    }

    const originalData: TestData = { id: 123, name: "test" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(originalData), "utf8"),
    );

    const validator = (data: unknown): data is TestData => {
      return (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "name" in data &&
        typeof (data as TestData).id === "number" &&
        typeof (data as TestData).name === "string"
      );
    };

    const result = await decompressData(compressed, validator);

    expect(result).toStrictEqual(originalData);
  });

  test("異常系: バリデーター関数で型が一致しない場合エラーが発生する", async () => {
    interface TestData {
      id: number;
      name: string;
    }

    const invalidData = { id: "not a number", name: "test" };
    const compressed = await gzipAsync(
      Buffer.from(JSON.stringify(invalidData), "utf8"),
    );

    const validator = (data: unknown): data is TestData => {
      return (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "name" in data &&
        typeof (data as TestData).id === "number" &&
        typeof (data as TestData).name === "string"
      );
    };

    await expect(decompressData(compressed, validator)).rejects.toThrow(
      "Decompressed data does not match expected type",
    );
  });
});

describe("compressRequestResponseData", () => {
  test("正常系: リクエストとレスポンスの両方を圧縮する", async () => {
    const requestData = { method: "GET", path: "/api/test" };
    const responseData = { status: 200, data: "success" };

    const result = await compressRequestResponseData(requestData, responseData);

    expect(Buffer.isBuffer(result.inputDataCompressed)).toStrictEqual(true);
    expect(Buffer.isBuffer(result.outputDataCompressed)).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
    expect(result.originalInputSize > 0).toStrictEqual(true);
    expect(result.originalOutputSize > 0).toStrictEqual(true);
    expect(result.inputCompressionRatio > 0).toStrictEqual(true);
    expect(result.outputCompressionRatio > 0).toStrictEqual(true);
  });

  test("正常系: リクエストがnullの場合でも処理できる", async () => {
    const responseData = { status: 200 };

    const result = await compressRequestResponseData(null, responseData);

    expect(result.originalInputSize).toStrictEqual(4); // "null"
    expect(Buffer.isBuffer(result.outputDataCompressed)).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
  });

  test("異常系: レスポンスがundefinedの場合はエラーが発生する", async () => {
    const requestData = { method: "POST" };

    await expect(
      compressRequestResponseData(requestData, undefined),
    ).rejects.toThrow("Cannot process undefined data");
  });

  test("正常系: 両方が空オブジェクトの場合でも処理できる", async () => {
    const result = await compressRequestResponseData({}, {});

    expect(Buffer.isBuffer(result.inputDataCompressed)).toStrictEqual(true);
    expect(Buffer.isBuffer(result.outputDataCompressed)).toStrictEqual(true);
    expect(result.compressionRatio > 0).toStrictEqual(true);
    expect(result.originalInputSize).toStrictEqual(2); // "{}"
    expect(result.originalOutputSize).toStrictEqual(2); // "{}"
  });

  test("正常系: 大きなデータでも並列処理で効率的に圧縮する", async () => {
    const largeRequest = { data: "x".repeat(10000) };
    const largeResponse = { data: "y".repeat(10000) };

    const startTime = Date.now();
    const result = await compressRequestResponseData(
      largeRequest,
      largeResponse,
    );
    const elapsedTime = Date.now() - startTime;

    expect(result.compressionRatio < 0.1).toStrictEqual(true);
    expect(result.originalInputSize > 10000).toStrictEqual(true);
    expect(result.originalOutputSize > 10000).toStrictEqual(true);
    expect(elapsedTime < 1000).toStrictEqual(true); // 1秒以内に完了
  });

  test("異常系: エラーが発生した場合、適切にエラーを伝播する", async () => {
    const oversizedRequest = { data: "x".repeat(100 * 1024 * 1024 + 1) };
    const responseData = { status: 200 };

    await expect(
      compressRequestResponseData(oversizedRequest, responseData),
    ).rejects.toThrow("Data size exceeds maximum limit of 100MB");
  });

  test("正常系: includeOverallRatioがfalseの場合、全体圧縮率が1.0になる", async () => {
    const requestData = { method: "GET" };
    const responseData = { status: 200 };

    const result = await compressRequestResponseData(
      requestData,
      responseData,
      false,
    );

    expect(result.compressionRatio).toStrictEqual(1.0);
    expect(Buffer.isBuffer(result.inputDataCompressed)).toStrictEqual(true);
    expect(Buffer.isBuffer(result.outputDataCompressed)).toStrictEqual(true);
  });

  test("異常系: リクエストがundefinedの場合エラーが発生する", async () => {
    const responseData = { status: 200 };

    await expect(
      compressRequestResponseData(undefined, responseData),
    ).rejects.toThrow("Cannot process undefined data");
  });
});

describe("calculateDataSize", () => {
  test("正常系: 文字列のサイズを正確に計算する", () => {
    const data = "Hello, World!";
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(15); // "\"Hello, World!\""
  });

  test("正常系: オブジェクトのサイズを正確に計算する", () => {
    const data = { key: "value" };
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(15); // {"key":"value"}
  });

  test("正常系: 配列のサイズを正確に計算する", () => {
    const data = [1, 2, 3];
    const size = calculateDataSize(data);

    expect(size).toStrictEqual(7); // [1,2,3]
  });

  test("正常系: 日本語文字列のバイトサイズを正確に計算する", () => {
    const data = "こんにちは";
    const size = calculateDataSize(data);

    // "こんにちは" (UTF-8) + quotes
    expect(size).toStrictEqual(17);
  });

  test("正常系: nullのサイズを計算する", () => {
    const size = calculateDataSize(null);

    expect(size).toStrictEqual(4); // null
  });

  test("異常系: undefinedのサイズを計算する", () => {
    expect(() => calculateDataSize(undefined)).toThrow(
      "Cannot process undefined data",
    );
  });

  test("正常系: 空オブジェクトのサイズを計算する", () => {
    const size = calculateDataSize({});

    expect(size).toStrictEqual(2); // {}
  });

  test("正常系: ネストしたオブジェクトのサイズを計算する", () => {
    const data = {
      level1: {
        level2: {
          value: "nested",
        },
      },
    };
    const size = calculateDataSize(data);

    expect(size > 30).toStrictEqual(true);
  });

  test("異常系: 循環参照を持つオブジェクトでエラーが発生する", () => {
    const obj: { a: number; self?: unknown } = { a: 1 };
    obj.self = obj;

    expect(() => calculateDataSize(obj)).toThrow();
  });

  test("正常系: 大きなデータのサイズを計算する", () => {
    const largeData = { content: "x".repeat(10000) };
    const size = calculateDataSize(largeData);

    expect(size > 10000).toStrictEqual(true);
  });

  test("正常系: 数値のサイズを計算する", () => {
    const size = calculateDataSize(12345);

    expect(size).toStrictEqual(5); // 12345
  });

  test("正常系: 真偽値のサイズを計算する", () => {
    expect(calculateDataSize(true)).toStrictEqual(4); // true
    expect(calculateDataSize(false)).toStrictEqual(5); // false
  });
});

describe("parseJsonSafely", () => {
  test("正常系: 通常のJSONをパースする", () => {
    const json = '{"key": "value", "number": 123}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ key: "value", number: 123 });
  });

  test("正常系: __proto__キーを除外する", () => {
    const json = '{"__proto__": {"admin": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    expect(
      Object.prototype.hasOwnProperty.call(result, "__proto__"),
    ).toStrictEqual(false);
  });

  test("正常系: constructorキーを除外する", () => {
    const json = '{"constructor": {"isAdmin": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    const ctor = (result as Record<string, unknown>).constructor;
    expect("isAdmin" in ctor).toStrictEqual(false);
  });

  test("正常系: prototypeキーを除外する", () => {
    const json = '{"prototype": {"vulnerable": true}, "safe": "data"}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ safe: "data" });
    expect((result as Record<string, unknown>).prototype).toStrictEqual(
      undefined,
    );
  });

  test("正常系: ネストされたオブジェクトでも危険なキーを除外する", () => {
    const json = '{"nested": {"__proto__": {"admin": true}, "safe": "value"}}';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual({ nested: { safe: "value" } });
  });

  test("正常系: 配列内のオブジェクトでも危険なキーを除外する", () => {
    const json = '[{"__proto__": {"admin": true}}, {"safe": "item"}]';
    const result = parseJsonSafely(json);

    expect(result).toStrictEqual([{}, { safe: "item" }]);
  });

  test("異常系: 不正なJSONでエラーが発生する", () => {
    const invalidJson = "{ invalid json }";

    expect(() => parseJsonSafely(invalidJson)).toThrow();
  });

  test("異常系: 空文字列でエラーが発生する", () => {
    expect(() => parseJsonSafely("")).toThrow();
  });

  test("正常系: nullをパースできる", () => {
    const result = parseJsonSafely("null");

    expect(result).toStrictEqual(null);
  });

  test("正常系: 数値をパースできる", () => {
    const result = parseJsonSafely("123");

    expect(result).toStrictEqual(123);
  });

  test("正常系: 文字列をパースできる", () => {
    const result = parseJsonSafely('"hello"');

    expect(result).toStrictEqual("hello");
  });

  test("正常系: 真偽値をパースできる", () => {
    expect(parseJsonSafely("true")).toStrictEqual(true);
    expect(parseJsonSafely("false")).toStrictEqual(false);
  });

  test("正常系: 配列をパースできる", () => {
    const result = parseJsonSafely('[1, 2, "three"]');

    expect(result).toStrictEqual([1, 2, "three"]);
  });

  test("正常系: 空の配列をパースできる", () => {
    const result = parseJsonSafely("[]");

    expect(result).toStrictEqual([]);
  });

  test("正常系: 空のオブジェクトをパースできる", () => {
    const result = parseJsonSafely("{}");

    expect(result).toStrictEqual({});
  });
});
