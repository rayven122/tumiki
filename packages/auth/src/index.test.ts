import { describe, expect, test } from "vitest";

import * as common from "./common";
import * as index from "./index";

describe("index", () => {
  test("commonモジュールのすべてのエクスポートが再エクスポートされている", () => {
    // OAuthErrorクラスが再エクスポートされていることを確認
    expect(index.OAuthError).toStrictEqual(common.OAuthError);

    // OAuthErrorCode enumが再エクスポートされていることを確認
    expect(index.OAuthErrorCode).toStrictEqual(common.OAuthErrorCode);

    // OAuthErrorMessagesオブジェクトが再エクスポートされていることを確認
    expect(index.OAuthErrorMessages).toStrictEqual(common.OAuthErrorMessages);

    // createOAuthError関数が再エクスポートされていることを確認
    expect(index.createOAuthError).toStrictEqual(common.createOAuthError);
  });

  test("OAuthErrorインスタンスを作成できる", () => {
    // 再エクスポートされたOAuthErrorクラスを使用してインスタンスを作成
    const error = new index.OAuthError(
      "テストエラー",
      index.OAuthErrorCode.INVALID_PROVIDER,
      "test-provider",
    );

    expect(error).toBeInstanceOf(index.OAuthError);
    expect(error.message).toStrictEqual("テストエラー");
    expect(error.code).toStrictEqual(index.OAuthErrorCode.INVALID_PROVIDER);
    expect(error.provider).toStrictEqual("test-provider");
    expect(error.name).toStrictEqual("OAuthError");
  });

  test("createOAuthError関数が正しく動作する", () => {
    // 再エクスポートされたcreateOAuthError関数を使用（デフォルトメッセージ）
    const error = index.createOAuthError(index.OAuthErrorCode.NO_ACCESS_TOKEN);

    expect(error).toBeInstanceOf(index.OAuthError);
    expect(error.message).toStrictEqual("アクセストークンが見つかりません");
    expect(error.code).toStrictEqual(index.OAuthErrorCode.NO_ACCESS_TOKEN);
    expect(error.provider).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  test("OAuthErrorCodeのすべての値にアクセスできる", () => {
    // enumのキーを取得して、すべての値が存在することを確認
    const errorCodes = Object.values(index.OAuthErrorCode);

    expect(errorCodes).toContain("UNAUTHORIZED");
    expect(errorCodes).toContain("TOKEN_EXPIRED");
    expect(errorCodes).toContain("INVALID_TOKEN");
    expect(errorCodes).toContain("NO_ACCESS_TOKEN");
    expect(errorCodes).toContain("CONNECTION_FAILED");
    expect(errorCodes).toContain("PROVIDER_ERROR");
    expect(errorCodes).toContain("INVALID_PROVIDER");
    expect(errorCodes).toContain("INVALID_SCOPE");
    expect(errorCodes).toContain("MISSING_CONFIGURATION");
    expect(errorCodes).toContain("UNKNOWN_ERROR");

    // 正確に10個のエラーコードがあることを確認
    expect(errorCodes).toHaveLength(10);
  });

  test("OAuthErrorMessagesのすべてのメッセージにアクセスできる", () => {
    // すべてのエラーコードに対応するメッセージが存在することを確認
    const errorCodes = Object.values(
      index.OAuthErrorCode,
    ) as index.OAuthErrorCode[];

    errorCodes.forEach((code) => {
      expect(index.OAuthErrorMessages[code]).toBeDefined();
      expect(typeof index.OAuthErrorMessages[code]).toStrictEqual("string");
      expect(index.OAuthErrorMessages[code].length).toBeGreaterThan(0);
    });
  });

  test("createOAuthErrorで全てのパラメータを使用できる", () => {
    const cause = new Error("原因エラー");
    const error = index.createOAuthError(
      index.OAuthErrorCode.CONNECTION_FAILED,
      "github",
      cause,
      "接続に失敗しました",
    );

    expect(error).toBeInstanceOf(index.OAuthError);
    expect(error.message).toStrictEqual("接続に失敗しました");
    expect(error.code).toStrictEqual(index.OAuthErrorCode.CONNECTION_FAILED);
    expect(error.provider).toStrictEqual("github");
    expect(error.cause).toStrictEqual(cause);
  });

  test("SessionData型が利用可能である", () => {
    // SessionData型は実行時に値を持たないため、型システムレベルでのテストとなる
    // TypeScriptの型チェックが通ることで、正しくエクスポートされていることを確認
    type TestSessionData = index.SessionData;

    // 型が存在することを確認するため、型アサーションを使用
    const testData = {} as TestSessionData;
    expect(testData).toBeDefined();
  });
});
