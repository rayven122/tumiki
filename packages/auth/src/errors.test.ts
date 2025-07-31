import { describe, expect, test } from "vitest";

import {
  createOAuthError,
  OAuthError,
  OAuthErrorCode,
  OAuthErrorMessages,
} from "./errors";

describe("OAuthError", () => {
  test("正常系: 基本的なエラーインスタンスを作成できる", () => {
    const error = new OAuthError(
      "エラーメッセージ",
      OAuthErrorCode.UNAUTHORIZED,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error.message).toStrictEqual("エラーメッセージ");
    expect(error.code).toStrictEqual(OAuthErrorCode.UNAUTHORIZED);
    expect(error.name).toStrictEqual("OAuthError");
    expect(error.provider).toStrictEqual(undefined);
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: すべてのパラメータを指定してエラーインスタンスを作成できる", () => {
    const cause = new Error("原因エラー");
    const error = new OAuthError(
      "カスタムメッセージ",
      OAuthErrorCode.PROVIDER_ERROR,
      "google",
      cause,
    );

    expect(error.message).toStrictEqual("カスタムメッセージ");
    expect(error.code).toStrictEqual(OAuthErrorCode.PROVIDER_ERROR);
    expect(error.provider).toStrictEqual("google");
    expect(error.cause).toStrictEqual(cause);
    expect(error.name).toStrictEqual("OAuthError");
  });

  test("正常系: プロバイダーのみを指定してエラーインスタンスを作成できる", () => {
    const error = new OAuthError(
      "エラーメッセージ",
      OAuthErrorCode.TOKEN_EXPIRED,
      "github",
    );

    expect(error.message).toStrictEqual("エラーメッセージ");
    expect(error.code).toStrictEqual(OAuthErrorCode.TOKEN_EXPIRED);
    expect(error.provider).toStrictEqual("github");
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: 原因のみを指定してエラーインスタンスを作成できる", () => {
    const cause = { errorCode: "NETWORK_ERROR" };
    const error = new OAuthError(
      "接続エラー",
      OAuthErrorCode.CONNECTION_FAILED,
      undefined,
      cause,
    );

    expect(error.message).toStrictEqual("接続エラー");
    expect(error.code).toStrictEqual(OAuthErrorCode.CONNECTION_FAILED);
    expect(error.provider).toStrictEqual(undefined);
    expect(error.cause).toStrictEqual(cause);
  });
});

describe("OAuthErrorCode", () => {
  test("正常系: すべてのエラーコードが定義されている", () => {
    expect(OAuthErrorCode.UNAUTHORIZED).toStrictEqual("UNAUTHORIZED");
    expect(OAuthErrorCode.TOKEN_EXPIRED).toStrictEqual("TOKEN_EXPIRED");
    expect(OAuthErrorCode.INVALID_TOKEN).toStrictEqual("INVALID_TOKEN");
    expect(OAuthErrorCode.NO_ACCESS_TOKEN).toStrictEqual("NO_ACCESS_TOKEN");
    expect(OAuthErrorCode.CONNECTION_FAILED).toStrictEqual("CONNECTION_FAILED");
    expect(OAuthErrorCode.PROVIDER_ERROR).toStrictEqual("PROVIDER_ERROR");
    expect(OAuthErrorCode.INVALID_PROVIDER).toStrictEqual("INVALID_PROVIDER");
    expect(OAuthErrorCode.INVALID_SCOPE).toStrictEqual("INVALID_SCOPE");
    expect(OAuthErrorCode.MISSING_CONFIGURATION).toStrictEqual(
      "MISSING_CONFIGURATION",
    );
    expect(OAuthErrorCode.UNKNOWN_ERROR).toStrictEqual("UNKNOWN_ERROR");
  });

  test("正常系: エラーコードの総数が正しい", () => {
    const errorCodes = Object.values(OAuthErrorCode);
    expect(errorCodes.length).toStrictEqual(10);
  });
});

describe("OAuthErrorMessages", () => {
  test("正常系: すべてのエラーコードに対応するメッセージが定義されている", () => {
    expect(OAuthErrorMessages[OAuthErrorCode.UNAUTHORIZED]).toStrictEqual(
      "認証されていません",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.TOKEN_EXPIRED]).toStrictEqual(
      "トークンの有効期限が切れています",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.INVALID_TOKEN]).toStrictEqual(
      "無効なトークンです",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.NO_ACCESS_TOKEN]).toStrictEqual(
      "アクセストークンが見つかりません",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.CONNECTION_FAILED]).toStrictEqual(
      "プロバイダーへの接続に失敗しました",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.PROVIDER_ERROR]).toStrictEqual(
      "プロバイダーからエラーが返されました",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.INVALID_PROVIDER]).toStrictEqual(
      "無効なプロバイダーです",
    );
    expect(OAuthErrorMessages[OAuthErrorCode.INVALID_SCOPE]).toStrictEqual(
      "無効なスコープが指定されました",
    );
    expect(
      OAuthErrorMessages[OAuthErrorCode.MISSING_CONFIGURATION],
    ).toStrictEqual("必要な設定が不足しています");
    expect(OAuthErrorMessages[OAuthErrorCode.UNKNOWN_ERROR]).toStrictEqual(
      "不明なエラーが発生しました",
    );
  });

  test("正常系: すべてのエラーコードがメッセージマップに含まれている", () => {
    const errorCodes = Object.values(OAuthErrorCode);
    const messageKeys = Object.keys(OAuthErrorMessages);

    expect(messageKeys.length).toStrictEqual(errorCodes.length);

    errorCodes.forEach((code) => {
      expect(OAuthErrorMessages[code]).toBeDefined();
      expect(typeof OAuthErrorMessages[code]).toStrictEqual("string");
    });
  });
});

describe("createOAuthError", () => {
  test("正常系: エラーコードのみでエラーを作成できる", () => {
    const error = createOAuthError(OAuthErrorCode.UNAUTHORIZED);

    expect(error).toBeInstanceOf(OAuthError);
    expect(error.message).toStrictEqual("認証されていません");
    expect(error.code).toStrictEqual(OAuthErrorCode.UNAUTHORIZED);
    expect(error.provider).toStrictEqual(undefined);
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: プロバイダーを指定してエラーを作成できる", () => {
    const error = createOAuthError(OAuthErrorCode.TOKEN_EXPIRED, "facebook");

    expect(error.message).toStrictEqual("トークンの有効期限が切れています");
    expect(error.code).toStrictEqual(OAuthErrorCode.TOKEN_EXPIRED);
    expect(error.provider).toStrictEqual("facebook");
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: 原因を指定してエラーを作成できる", () => {
    const cause = new Error("ネットワークエラー");
    const error = createOAuthError(
      OAuthErrorCode.CONNECTION_FAILED,
      undefined,
      cause,
    );

    expect(error.message).toStrictEqual("プロバイダーへの接続に失敗しました");
    expect(error.code).toStrictEqual(OAuthErrorCode.CONNECTION_FAILED);
    expect(error.provider).toStrictEqual(undefined);
    expect(error.cause).toStrictEqual(cause);
  });

  test("正常系: カスタムメッセージを指定してエラーを作成できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.INVALID_TOKEN,
      undefined,
      undefined,
      "カスタムエラーメッセージ",
    );

    expect(error.message).toStrictEqual("カスタムエラーメッセージ");
    expect(error.code).toStrictEqual(OAuthErrorCode.INVALID_TOKEN);
    expect(error.provider).toStrictEqual(undefined);
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: すべてのパラメータを指定してエラーを作成できる", () => {
    const cause = { statusCode: 401 };
    const error = createOAuthError(
      OAuthErrorCode.PROVIDER_ERROR,
      "twitter",
      cause,
      "Twitter APIからエラーが返されました",
    );

    expect(error.message).toStrictEqual("Twitter APIからエラーが返されました");
    expect(error.code).toStrictEqual(OAuthErrorCode.PROVIDER_ERROR);
    expect(error.provider).toStrictEqual("twitter");
    expect(error.cause).toStrictEqual(cause);
  });

  test("正常系: カスタムメッセージがない場合はデフォルトメッセージが使用される", () => {
    const error = createOAuthError(
      OAuthErrorCode.NO_ACCESS_TOKEN,
      "linkedin",
      undefined,
      undefined,
    );

    expect(error.message).toStrictEqual("アクセストークンが見つかりません");
    expect(error.code).toStrictEqual(OAuthErrorCode.NO_ACCESS_TOKEN);
    expect(error.provider).toStrictEqual("linkedin");
  });

  test("正常系: 各エラーコードで正しいメッセージが設定される", () => {
    Object.values(OAuthErrorCode).forEach((code) => {
      const error = createOAuthError(code);
      expect(error.message).toStrictEqual(OAuthErrorMessages[code]);
      expect(error.code).toStrictEqual(code);
    });
  });

  test("正常系: undefinedの原因でもエラーを作成できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.UNKNOWN_ERROR,
      "custom-provider",
      undefined,
    );

    expect(error.message).toStrictEqual("不明なエラーが発生しました");
    expect(error.code).toStrictEqual(OAuthErrorCode.UNKNOWN_ERROR);
    expect(error.provider).toStrictEqual("custom-provider");
    expect(error.cause).toStrictEqual(undefined);
  });

  test("正常系: 空文字列のプロバイダーでもエラーを作成できる", () => {
    const error = createOAuthError(OAuthErrorCode.INVALID_PROVIDER, "");

    expect(error.message).toStrictEqual("無効なプロバイダーです");
    expect(error.code).toStrictEqual(OAuthErrorCode.INVALID_PROVIDER);
    expect(error.provider).toStrictEqual("");
  });

  test("正常系: 空文字列のカスタムメッセージを指定できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.INVALID_SCOPE,
      undefined,
      undefined,
      "",
    );

    expect(error.message).toStrictEqual("");
    expect(error.code).toStrictEqual(OAuthErrorCode.INVALID_SCOPE);
  });

  test("正常系: 原因として文字列を指定できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.MISSING_CONFIGURATION,
      undefined,
      "設定ファイルが見つかりません",
    );

    expect(error.message).toStrictEqual("必要な設定が不足しています");
    expect(error.code).toStrictEqual(OAuthErrorCode.MISSING_CONFIGURATION);
    expect(error.cause).toStrictEqual("設定ファイルが見つかりません");
  });

  test("正常系: 原因として数値を指定できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.PROVIDER_ERROR,
      undefined,
      500,
    );

    expect(error.message).toStrictEqual("プロバイダーからエラーが返されました");
    expect(error.code).toStrictEqual(OAuthErrorCode.PROVIDER_ERROR);
    expect(error.cause).toStrictEqual(500);
  });

  test("正常系: 原因としてnullを指定できる", () => {
    const error = createOAuthError(
      OAuthErrorCode.UNKNOWN_ERROR,
      undefined,
      null,
    );

    expect(error.message).toStrictEqual("不明なエラーが発生しました");
    expect(error.code).toStrictEqual(OAuthErrorCode.UNKNOWN_ERROR);
    expect(error.cause).toStrictEqual(null);
  });
});
