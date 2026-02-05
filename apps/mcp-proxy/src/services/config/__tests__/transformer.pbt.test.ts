/**
 * DB型からクライアント型への変換関数のProperty-Based Testing
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { mapTransportType, mapAuthType } from "../transformer.js";

const dbTransportTypeArbitrary = fc.constantFrom(
  "SSE" as const,
  "STREAMABLE_HTTPS" as const,
  "STDIO" as const,
);

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
    const invalidTypes = ["UNKNOWN", "HTTP", "TCP", "WEBSOCKET", ""] as const;

    for (const invalidType of invalidTypes) {
      expect(() =>
        mapTransportType(invalidType as "SSE" | "STREAMABLE_HTTPS" | "STDIO"),
      ).toThrow(/Unknown transport type/);
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
    const invalidTypes = ["UNKNOWN", "BASIC", "JWT", "TOKEN", ""] as const;

    for (const invalidType of invalidTypes) {
      expect(() =>
        mapAuthType(invalidType as "NONE" | "API_KEY" | "OAUTH"),
      ).toThrow(/Unknown auth type/);
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
