import { describe, test, expect } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "../pkce";

describe("PKCE", () => {
  describe("generateCodeVerifier", () => {
    test("43文字以上128文字以下のBase64 URL-safe文字列を生成する", () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
      // Base64 URL-safe文字のみ含む（+, /, = は含まない）
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test("毎回異なる値を生成する", () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe("generateCodeChallenge", () => {
    test("Base64 URL-safe文字列を返す", () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test("同じverifierからは同じchallengeが生成される", () => {
      const verifier = "test-verifier-value";
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    test("異なるverifierからは異なるchallengeが生成される", () => {
      const challenge1 = generateCodeChallenge("verifier-a");
      const challenge2 = generateCodeChallenge("verifier-b");
      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe("generateState", () => {
    test("32文字の16進数文字列を生成する", () => {
      const state = generateState();
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    test("毎回異なる値を生成する", () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });
});
