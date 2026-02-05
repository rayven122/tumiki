/**
 * Property-Based Testing for config/transformer.ts
 *
 * DB型からクライアント型への変換関数をPBTでテスト
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { mapTransportType, mapAuthType } from "../transformer.js";

// DB TransportType の Arbitrary
const dbTransportTypeArbitrary = fc.constantFrom(
  "SSE" as const,
  "STREAMABLE_HTTPS" as const,
  "STDIO" as const,
);

// DB AuthType の Arbitrary
const dbAuthTypeArbitrary = fc.constantFrom(
  "NONE" as const,
  "API_KEY" as const,
  "OAUTH" as const,
);

describe("mapTransportType", () => {
  test("全ての有効なTransportTypeが正しくマッピングされる", () => {
    fc.assert(
      fc.property(dbTransportTypeArbitrary, (transportType) => {
        const result = mapTransportType(transportType);

        // 結果は必ず3つの値のいずれか
        expect(["sse", "http", "stdio"]).toContain(result);

        // 各値が正しくマッピングされている
        switch (transportType) {
          case "SSE":
            expect(result).toBe("sse");
            break;
          case "STREAMABLE_HTTPS":
            expect(result).toBe("http");
            break;
          case "STDIO":
            expect(result).toBe("stdio");
            break;
        }
      }),
      { numRuns: 100 },
    );
  });

  test("決定論的: 同じ入力は常に同じ出力を返す", () => {
    fc.assert(
      fc.property(dbTransportTypeArbitrary, (transportType) => {
        const result1 = mapTransportType(transportType);
        const result2 = mapTransportType(transportType);

        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });

  test("不明なトランスポートタイプでエラーをスローする", () => {
    // 実際のEnum値以外の文字列を渡す（型エラーを回避するためにany使用）
    const invalidTypes = ["UNKNOWN", "HTTP", "TCP", "WEBSOCKET", ""];

    for (const invalidType of invalidTypes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => mapTransportType(invalidType as any)).toThrow(
        /Unknown transport type/,
      );
    }
  });
});

describe("mapAuthType", () => {
  test("全ての有効なAuthTypeが正しくマッピングされる", () => {
    fc.assert(
      fc.property(dbAuthTypeArbitrary, (authType) => {
        const result = mapAuthType(authType);

        // 結果は必ず3つの値のいずれか
        expect(["none", "bearer", "api_key"]).toContain(result);

        // 各値が正しくマッピングされている
        switch (authType) {
          case "NONE":
            expect(result).toBe("none");
            break;
          case "API_KEY":
            expect(result).toBe("api_key");
            break;
          case "OAUTH":
            expect(result).toBe("bearer");
            break;
        }
      }),
      { numRuns: 100 },
    );
  });

  test("決定論的: 同じ入力は常に同じ出力を返す", () => {
    fc.assert(
      fc.property(dbAuthTypeArbitrary, (authType) => {
        const result1 = mapAuthType(authType);
        const result2 = mapAuthType(authType);

        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });

  test("不明な認証タイプでエラーをスローする", () => {
    // 実際のEnum値以外の文字列を渡す
    const invalidTypes = ["UNKNOWN", "BASIC", "JWT", "TOKEN", ""];

    for (const invalidType of invalidTypes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => mapAuthType(invalidType as any)).toThrow(
        /Unknown auth type/,
      );
    }
  });
});

describe("マッピング全射性", () => {
  test("TransportType: 全てのクライアント値がDBから到達可能", () => {
    const clientValues = new Set<string>();

    fc.assert(
      fc.property(dbTransportTypeArbitrary, (transportType) => {
        clientValues.add(mapTransportType(transportType));
        return true;
      }),
      { numRuns: 100 },
    );

    // 全てのクライアント値がカバーされている
    expect(clientValues).toStrictEqual(new Set(["sse", "http", "stdio"]));
  });

  test("AuthType: 全てのクライアント値がDBから到達可能", () => {
    const clientValues = new Set<string>();

    fc.assert(
      fc.property(dbAuthTypeArbitrary, (authType) => {
        clientValues.add(mapAuthType(authType));
        return true;
      }),
      { numRuns: 100 },
    );

    // 全てのクライアント値がカバーされている
    expect(clientValues).toStrictEqual(new Set(["none", "bearer", "api_key"]));
  });
});
