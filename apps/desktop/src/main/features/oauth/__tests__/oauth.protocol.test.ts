import { describe, test, expect } from "vitest";
import { parseOAuthCallback } from "../oauth.protocol";

describe("oauth.protocol", () => {
  describe("parseOAuthCallback", () => {
    test("ループバックURLからcodeとstateを正常に抽出する", () => {
      const result = parseOAuthCallback(
        "http://127.0.0.1:50123/callback?code=auth-code-123&state=random-state",
      );
      expect(result).toStrictEqual({
        code: "auth-code-123",
        state: "random-state",
      });
    });

    test("OAuthエラーパラメータがある場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback(
          "http://127.0.0.1:50123/callback?error=access_denied&error_description=User%20denied%20access",
        ),
      ).toThrow("OAuth認証エラー: User denied access");
    });

    test("error_descriptionがない場合errorをメッセージに使用する", () => {
      expect(() =>
        parseOAuthCallback(
          "http://127.0.0.1:50123/callback?error=access_denied",
        ),
      ).toThrow("OAuth認証エラー: access_denied");
    });

    test("codeが欠落している場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback("http://127.0.0.1:50123/callback?state=xyz"),
      ).toThrow("認可コードが見つかりません");
    });

    test("stateが欠落している場合エラーをスローする", () => {
      expect(() =>
        parseOAuthCallback("http://127.0.0.1:50123/callback?code=abc"),
      ).toThrow("stateパラメータが見つかりません");
    });
  });
});
