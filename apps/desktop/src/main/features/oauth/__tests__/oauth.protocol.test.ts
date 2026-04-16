import { describe, test, expect } from "vitest";
import { isMcpOAuthCallback, parseOAuthCallback } from "../oauth.protocol";

describe("oauth.protocol", () => {
  describe("isMcpOAuthCallback", () => {
    test("正しいMCP OAuthコールバックURLを認識する", () => {
      expect(
        isMcpOAuthCallback("tumiki://oauth/callback?code=abc&state=xyz"),
      ).toBe(true);
    });

    test("Keycloakコールバックを拒否する", () => {
      expect(
        isMcpOAuthCallback("tumiki://auth/callback?code=abc&state=xyz"),
      ).toBe(false);
    });

    test("異なるホストを拒否する", () => {
      expect(isMcpOAuthCallback("tumiki://wrong-host/callback?code=abc")).toBe(
        false,
      );
    });

    test("異なるパスを拒否する", () => {
      expect(isMcpOAuthCallback("tumiki://oauth/other?code=abc")).toBe(false);
    });

    test("不正なURLを拒否する", () => {
      expect(isMcpOAuthCallback("not-a-url")).toBe(false);
    });

    test("空文字を拒否する", () => {
      expect(isMcpOAuthCallback("")).toBe(false);
    });
  });

  describe("parseOAuthCallback", () => {
    test("codeとstateを正常に抽出する", () => {
      const result = parseOAuthCallback(
        "tumiki://oauth/callback?code=auth-code-123&state=random-state",
      );
      expect(result).toStrictEqual({
        code: "auth-code-123",
        state: "random-state",
      });
    });

    test("OAuthエラーパラメータがある場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback(
          "tumiki://oauth/callback?error=access_denied&error_description=User%20denied%20access",
        ),
      ).toThrow("OAuth認証エラー: User denied access");
    });

    test("error_descriptionがない場合errorをメッセージに使用する", () => {
      expect(() =>
        parseOAuthCallback("tumiki://oauth/callback?error=access_denied"),
      ).toThrow("OAuth認証エラー: access_denied");
    });

    test("codeが欠落している場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback("tumiki://oauth/callback?state=xyz"),
      ).toThrow("認可コードが見つかりません");
    });

    test("stateが欠落している場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback("tumiki://oauth/callback?code=abc"),
      ).toThrow("stateパラメータが見つかりません");
    });
  });
});
