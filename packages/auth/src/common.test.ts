import { describe, expect, test } from "vitest";

import * as common from "./common";
import * as errors from "./errors";

describe("common", () => {
  test("errorsモジュールのすべてのエクスポートが再エクスポートされている", () => {
    // OAuthErrorクラスが再エクスポートされていることを確認
    expect(common.OAuthError).toStrictEqual(errors.OAuthError);

    // OAuthErrorCode enumが再エクスポートされていることを確認
    expect(common.OAuthErrorCode).toStrictEqual(errors.OAuthErrorCode);

    // OAuthErrorMessagesオブジェクトが再エクスポートされていることを確認
    expect(common.OAuthErrorMessages).toStrictEqual(errors.OAuthErrorMessages);

    // createOAuthError関数が再エクスポートされていることを確認
    expect(common.createOAuthError).toStrictEqual(errors.createOAuthError);
  });

  test("OAuthErrorインスタンスを作成できる", () => {
    // 再エクスポートされたOAuthErrorクラスを使用してインスタンスを作成
    const error = new common.OAuthError(
      "テストエラー",
      common.OAuthErrorCode.UNAUTHORIZED,
    );

    expect(error).toBeInstanceOf(common.OAuthError);
    expect(error.message).toStrictEqual("テストエラー");
    expect(error.code).toStrictEqual(common.OAuthErrorCode.UNAUTHORIZED);
    expect(error.name).toStrictEqual("OAuthError");
  });

  test("createOAuthError関数が正しく動作する", () => {
    // 再エクスポートされたcreateOAuthError関数を使用
    const error = common.createOAuthError(
      common.OAuthErrorCode.TOKEN_EXPIRED,
      "google",
      new Error("元のエラー"),
      "カスタムメッセージ",
    );

    expect(error).toBeInstanceOf(common.OAuthError);
    expect(error.message).toStrictEqual("カスタムメッセージ");
    expect(error.code).toStrictEqual(common.OAuthErrorCode.TOKEN_EXPIRED);
    expect(error.provider).toStrictEqual("google");
    expect(error.cause).toBeInstanceOf(Error);
  });

  test("OAuthErrorCodeのすべての値にアクセスできる", () => {
    // すべてのエラーコードが再エクスポートされていることを確認
    expect(common.OAuthErrorCode.UNAUTHORIZED).toStrictEqual("UNAUTHORIZED");
    expect(common.OAuthErrorCode.TOKEN_EXPIRED).toStrictEqual("TOKEN_EXPIRED");
    expect(common.OAuthErrorCode.INVALID_TOKEN).toStrictEqual("INVALID_TOKEN");
    expect(common.OAuthErrorCode.NO_ACCESS_TOKEN).toStrictEqual(
      "NO_ACCESS_TOKEN",
    );
    expect(common.OAuthErrorCode.CONNECTION_FAILED).toStrictEqual(
      "CONNECTION_FAILED",
    );
    expect(common.OAuthErrorCode.PROVIDER_ERROR).toStrictEqual(
      "PROVIDER_ERROR",
    );
    expect(common.OAuthErrorCode.INVALID_PROVIDER).toStrictEqual(
      "INVALID_PROVIDER",
    );
    expect(common.OAuthErrorCode.INVALID_SCOPE).toStrictEqual("INVALID_SCOPE");
    expect(common.OAuthErrorCode.MISSING_CONFIGURATION).toStrictEqual(
      "MISSING_CONFIGURATION",
    );
    expect(common.OAuthErrorCode.UNKNOWN_ERROR).toStrictEqual("UNKNOWN_ERROR");
  });

  test("OAuthErrorMessagesのすべてのメッセージにアクセスできる", () => {
    // すべてのエラーメッセージが再エクスポートされていることを確認
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.UNAUTHORIZED],
    ).toStrictEqual("認証されていません");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.TOKEN_EXPIRED],
    ).toStrictEqual("トークンの有効期限が切れています");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.INVALID_TOKEN],
    ).toStrictEqual("無効なトークンです");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.NO_ACCESS_TOKEN],
    ).toStrictEqual("アクセストークンが見つかりません");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.CONNECTION_FAILED],
    ).toStrictEqual("プロバイダーへの接続に失敗しました");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.PROVIDER_ERROR],
    ).toStrictEqual("プロバイダーからエラーが返されました");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.INVALID_PROVIDER],
    ).toStrictEqual("無効なプロバイダーです");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.INVALID_SCOPE],
    ).toStrictEqual("無効なスコープが指定されました");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.MISSING_CONFIGURATION],
    ).toStrictEqual("必要な設定が不足しています");
    expect(
      common.OAuthErrorMessages[common.OAuthErrorCode.UNKNOWN_ERROR],
    ).toStrictEqual("不明なエラーが発生しました");
  });

  test("SessionData型が正しくエクスポートされている", () => {
    // SessionData型は実行時に値を持たないため、型システムレベルでのテストとなる
    // TypeScriptの型チェックが通ることで、正しくエクスポートされていることを確認
    type TestSessionData = common.SessionData;

    // 型が存在することを確認するため、型アサーションを使用
    const testData = {} as TestSessionData;
    expect(testData).toBeDefined();
  });
});
