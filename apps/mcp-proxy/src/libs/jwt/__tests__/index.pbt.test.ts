/**
 * Property-Based Testing for libs/jwt/index.ts
 *
 * JWT発行者抽出関数のPBTテスト
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { getIssuerFromToken } from "../index.js";

// Base64URL エンコード用ヘルパー
const base64UrlEncode = (data: string): string =>
  Buffer.from(data).toString("base64url");

// JWT ペイロード Arbitrary（issuer付き）
const jwtPayloadWithIssuerArbitrary = fc.record({
  iss: fc.string({ minLength: 1 }),
  sub: fc.option(fc.string(), { nil: undefined }),
  aud: fc.option(fc.string(), { nil: undefined }),
  exp: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  iat: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
});

// JWT ペイロード Arbitrary（issuerなし）
const jwtPayloadWithoutIssuerArbitrary = fc.record({
  sub: fc.option(fc.string(), { nil: undefined }),
  aud: fc.option(fc.string(), { nil: undefined }),
  exp: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  iat: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
});

// 有効なJWT Arbitrary
const validJwtWithIssuerArbitrary = jwtPayloadWithIssuerArbitrary.map(
  (payload) => {
    const header = base64UrlEncode(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    );
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = "signature";
    return {
      token: `${header}.${body}.${signature}`,
      expectedIss: payload.iss,
    };
  },
);

// issuerなしJWT Arbitrary
const validJwtWithoutIssuerArbitrary = jwtPayloadWithoutIssuerArbitrary.map(
  (payload) => {
    const header = base64UrlEncode(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    );
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = "signature";
    return `${header}.${body}.${signature}`;
  },
);

// 無効なJWT Arbitrary
const invalidJwtArbitrary = fc.oneof(
  // 空文字列
  fc.constant(""),
  // ドットが足りない
  fc.string().filter((s) => s.split(".").length !== 3),
  // 2部構成
  fc.tuple(fc.string(), fc.string()).map(([a, b]) => `${a}.${b}`),
  // 4部構成以上
  fc
    .array(fc.string(), { minLength: 4, maxLength: 10 })
    .map((parts) => parts.join(".")),
  // Base64URLとして無効
  fc.constantFrom("not-base64.invalid.token", "!!!.@@@.###"),
);

describe("getIssuerFromToken", () => {
  describe("有効なJWTの処理", () => {
    test("issuerを含むJWTから正しくissuerを抽出する", () => {
      fc.assert(
        fc.property(validJwtWithIssuerArbitrary, ({ token, expectedIss }) => {
          const result = getIssuerFromToken(token);

          expect(result).toBe(expectedIss);
        }),
        { numRuns: 500 },
      );
    });

    test("issuerを含まないJWTはnullを返す", () => {
      fc.assert(
        fc.property(validJwtWithoutIssuerArbitrary, (token) => {
          const result = getIssuerFromToken(token);

          expect(result).toBeNull();
        }),
        { numRuns: 500 },
      );
    });
  });

  describe("無効なJWTの処理", () => {
    test("3部構成でないトークンはnullを返す", () => {
      fc.assert(
        fc.property(invalidJwtArbitrary, (token) => {
          const result = getIssuerFromToken(token);

          expect(result).toBeNull();
        }),
        { numRuns: 500 },
      );
    });

    test("空文字列はnullを返す", () => {
      expect(getIssuerFromToken("")).toBeNull();
    });

    test("無効なBase64はnullを返す", () => {
      // 無効なBase64URL文字を含む
      expect(getIssuerFromToken("!@#.$%^.&*(")).toBeNull();
    });

    test("ペイロードがJSONでない場合はnullを返す", () => {
      const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
      const invalidPayload = base64UrlEncode("not-json");
      const token = `${header}.${invalidPayload}.signature`;

      expect(getIssuerFromToken(token)).toBeNull();
    });

    test("issが文字列でない場合はnullを返す", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string()),
            fc.constant(null),
          ),
          (invalidIss) => {
            const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
            const payload = base64UrlEncode(
              JSON.stringify({ iss: invalidIss }),
            );
            const token = `${header}.${payload}.signature`;

            const result = getIssuerFromToken(token);

            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("決定論性", () => {
    test("同じ入力は常に同じ出力を返す", () => {
      fc.assert(
        fc.property(fc.string(), (token) => {
          const result1 = getIssuerFromToken(token);
          const result2 = getIssuerFromToken(token);

          expect(result1).toBe(result2);
        }),
        { numRuns: 500 },
      );
    });
  });

  describe("エッジケース", () => {
    test("Keycloak形式のissuerを正しく抽出する", () => {
      const keycloakIss = "https://auth.example.com/realms/test";
      const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
      const payload = base64UrlEncode(JSON.stringify({ iss: keycloakIss }));
      const token = `${header}.${payload}.signature`;

      expect(getIssuerFromToken(token)).toBe(keycloakIss);
    });

    test("ペイロードにiss以外のフィールドがあっても正しく動作する", () => {
      const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
      const payload = base64UrlEncode(
        JSON.stringify({
          iss: "test-issuer",
          sub: "user123",
          aud: "client",
          exp: 1234567890,
          iat: 1234567880,
          extra: { nested: "data" },
        }),
      );
      const token = `${header}.${payload}.signature`;

      expect(getIssuerFromToken(token)).toBe("test-issuer");
    });

    test("空のissuer文字列を正しく返す", () => {
      const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
      const payload = base64UrlEncode(JSON.stringify({ iss: "" }));
      const token = `${header}.${payload}.signature`;

      expect(getIssuerFromToken(token)).toBe("");
    });

    test("Unicode文字を含むissuerを正しく抽出する", () => {
      fc.assert(
        fc.property(
          fc.string({ unit: "grapheme", minLength: 1 }),
          (unicodeIss) => {
            const header = base64UrlEncode(JSON.stringify({ alg: "RS256" }));
            const payload = base64UrlEncode(
              JSON.stringify({ iss: unicodeIss }),
            );
            const token = `${header}.${payload}.signature`;

            const result = getIssuerFromToken(token);

            expect(result).toBe(unicodeIss);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
