import { describe, expect, test } from "vitest";

import {
  baseMailOptionsSchema,
  emailAddressSchema,
  invitationDataSchema,
  mailConfigSchema,
  notificationDataSchema,
  waitingListDataSchema,
} from "./index";

describe("mailConfigSchema", () => {
  test("正常系: 完全な設定オブジェクトをパースできる", () => {
    const validConfig = {
      host: "smtp.example.com",
      port: 587,
      secure: true,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    const result = mailConfigSchema.parse(validConfig);
    expect(result).toStrictEqual(validConfig);
  });

  test("正常系: secureを省略した場合はfalseがデフォルト値になる", () => {
    const configWithoutSecure = {
      host: "smtp.example.com",
      port: 587,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    const result = mailConfigSchema.parse(configWithoutSecure);
    expect(result.secure).toStrictEqual(false);
  });

  test("正常系: secureがfalseの場合", () => {
    const configWithSecureFalse = {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    const result = mailConfigSchema.parse(configWithSecureFalse);
    expect(result.secure).toStrictEqual(false);
  });

  test("異常系: hostが欠落している場合はエラー", () => {
    const invalidConfig = {
      port: 587,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: portが欠落している場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: authが欠落している場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: auth.userが欠落している場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      auth: {
        pass: "password123",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: auth.passが欠落している場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      auth: {
        user: "user@example.com",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: fromが欠落している場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: fromが無効なメールアドレスの場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "invalid-email",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: portが文字列の場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: "587",
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });

  test("異常系: secureが文字列の場合はエラー", () => {
    const invalidConfig = {
      host: "smtp.example.com",
      port: 587,
      secure: "true",
      auth: {
        user: "user@example.com",
        pass: "password123",
      },
      from: "sender@example.com",
    };
    expect(() => mailConfigSchema.parse(invalidConfig)).toThrow();
  });
});

describe("emailAddressSchema", () => {
  test("正常系: 有効なメールアドレスをパースできる", () => {
    expect(emailAddressSchema.parse("user@example.com")).toStrictEqual(
      "user@example.com",
    );
  });

  test("正常系: サブドメインを含むメールアドレスをパースできる", () => {
    expect(emailAddressSchema.parse("user@mail.example.com")).toStrictEqual(
      "user@mail.example.com",
    );
  });

  test("正常系: ドットを含むユーザー名をパースできる", () => {
    expect(emailAddressSchema.parse("first.last@example.com")).toStrictEqual(
      "first.last@example.com",
    );
  });

  test("異常系: @マークがない場合はエラー", () => {
    expect(() => emailAddressSchema.parse("userexample.com")).toThrow();
  });

  test("異常系: ドメイン部分がない場合はエラー", () => {
    expect(() => emailAddressSchema.parse("user@")).toThrow();
  });

  test("異常系: ユーザー名部分がない場合はエラー", () => {
    expect(() => emailAddressSchema.parse("@example.com")).toThrow();
  });

  test("異常系: 空文字列の場合はエラー", () => {
    expect(() => emailAddressSchema.parse("")).toThrow();
  });

  test("異常系: スペースを含む場合はエラー", () => {
    expect(() => emailAddressSchema.parse("user @example.com")).toThrow();
  });
});

describe("baseMailOptionsSchema", () => {
  test("正常系: toが単一メールアドレス文字列の場合", () => {
    const options = {
      to: "user@example.com",
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: toがメールアドレス配列の場合", () => {
    const options = {
      to: ["user1@example.com", "user2@example.com"],
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: 全フィールドを含む場合", () => {
    const options = {
      to: "user@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: ccが単一メールアドレス文字列の場合", () => {
    const options = {
      to: "user@example.com",
      cc: "cc@example.com",
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: bccが配列の場合", () => {
    const options = {
      to: "user@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: 空の配列をtoに指定できる", () => {
    const options = {
      to: [],
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("正常系: オプショナルフィールドを省略できる", () => {
    const options = {
      to: "user@example.com",
    };
    const result = baseMailOptionsSchema.parse(options);
    expect(result).toStrictEqual(options);
  });

  test("異常系: toが欠落している場合はエラー", () => {
    const options = {
      cc: "cc@example.com",
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });

  test("異常系: toが無効なメールアドレスの場合はエラー", () => {
    const options = {
      to: "invalid-email",
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });

  test("異常系: toの配列に無効なメールアドレスが含まれる場合はエラー", () => {
    const options = {
      to: ["valid@example.com", "invalid-email"],
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });

  test("異常系: ccが無効なメールアドレスの場合はエラー", () => {
    const options = {
      to: "user@example.com",
      cc: "invalid-cc",
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });

  test("異常系: bccの配列に無効なメールアドレスが含まれる場合はエラー", () => {
    const options = {
      to: "user@example.com",
      bcc: ["valid@example.com", "invalid-bcc"],
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });

  test("異常系: replyToが無効なメールアドレスの場合はエラー", () => {
    const options = {
      to: "user@example.com",
      replyTo: "invalid-replyto",
    };
    expect(() => baseMailOptionsSchema.parse(options)).toThrow();
  });
});

describe("waitingListDataSchema", () => {
  test("正常系: 必須フィールドのみでパースできる", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "https://example.com/confirm",
    };
    const result = waitingListDataSchema.parse(data);
    expect(result).toStrictEqual({
      ...data,
      appName: "Tumiki",
      language: "ja",
    });
  });

  test("正常系: 全フィールドを指定した場合", () => {
    const data = {
      email: "user@example.com",
      name: "山田太郎",
      confirmUrl: "https://example.com/confirm",
      appName: "MyApp",
      language: "en" as const,
    };
    const result = waitingListDataSchema.parse(data);
    expect(result).toStrictEqual(data);
  });

  test("正常系: languageがjaの場合", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "https://example.com/confirm",
      language: "ja" as const,
    };
    const result = waitingListDataSchema.parse(data);
    expect(result.language).toStrictEqual("ja");
  });

  test("正常系: nameが空文字列の場合", () => {
    const data = {
      email: "user@example.com",
      name: "",
      confirmUrl: "https://example.com/confirm",
    };
    const result = waitingListDataSchema.parse(data);
    expect(result.name).toStrictEqual("");
  });

  test("正常系: appNameを省略した場合はデフォルト値が使用される", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "https://example.com/confirm",
    };
    const result = waitingListDataSchema.parse(data);
    expect(result.appName).toStrictEqual("Tumiki");
  });

  test("正常系: languageを省略した場合はデフォルト値が使用される", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "https://example.com/confirm",
    };
    const result = waitingListDataSchema.parse(data);
    expect(result.language).toStrictEqual("ja");
  });

  test("異常系: emailが欠落している場合はエラー", () => {
    const data = {
      confirmUrl: "https://example.com/confirm",
    };
    expect(() => waitingListDataSchema.parse(data)).toThrow();
  });

  test("異常系: emailが無効な場合はエラー", () => {
    const data = {
      email: "invalid-email",
      confirmUrl: "https://example.com/confirm",
    };
    expect(() => waitingListDataSchema.parse(data)).toThrow();
  });

  test("異常系: confirmUrlが欠落している場合はエラー", () => {
    const data = {
      email: "user@example.com",
    };
    expect(() => waitingListDataSchema.parse(data)).toThrow();
  });

  test("異常系: confirmUrlが無効なURLの場合はエラー", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "not-a-url",
    };
    expect(() => waitingListDataSchema.parse(data)).toThrow();
  });

  test("異常系: languageが無効な値の場合はエラー", () => {
    const data = {
      email: "user@example.com",
      confirmUrl: "https://example.com/confirm",
      language: "fr",
    };
    expect(() => waitingListDataSchema.parse(data)).toThrow();
  });
});

describe("invitationDataSchema", () => {
  test("正常系: 必須フィールドのみでパースできる", () => {
    const data = {
      email: "user@example.com",
      inviteUrl: "https://example.com/invite",
    };
    const result = invitationDataSchema.parse(data);
    expect(result).toStrictEqual({
      ...data,
      appName: "Tumiki",
    });
  });

  test("正常系: 全フィールドを指定した場合", () => {
    const data = {
      email: "user@example.com",
      name: "山田太郎",
      inviteUrl: "https://example.com/invite",
      appName: "MyApp",
      expiresAt: "2024-12-31T23:59:59Z",
    };
    const result = invitationDataSchema.parse(data);
    expect(result).toStrictEqual(data);
  });

  test("正常系: nameを省略できる", () => {
    const data = {
      email: "user@example.com",
      inviteUrl: "https://example.com/invite",
    };
    const result = invitationDataSchema.parse(data);
    expect(result.name).toStrictEqual(undefined);
  });

  test("正常系: expiresAtを省略できる", () => {
    const data = {
      email: "user@example.com",
      inviteUrl: "https://example.com/invite",
    };
    const result = invitationDataSchema.parse(data);
    expect(result.expiresAt).toStrictEqual(undefined);
  });

  test("正常系: appNameを省略した場合はデフォルト値が使用される", () => {
    const data = {
      email: "user@example.com",
      inviteUrl: "https://example.com/invite",
    };
    const result = invitationDataSchema.parse(data);
    expect(result.appName).toStrictEqual("Tumiki");
  });

  test("異常系: emailが欠落している場合はエラー", () => {
    const data = {
      inviteUrl: "https://example.com/invite",
    };
    expect(() => invitationDataSchema.parse(data)).toThrow();
  });

  test("異常系: emailが無効な場合はエラー", () => {
    const data = {
      email: "not-an-email",
      inviteUrl: "https://example.com/invite",
    };
    expect(() => invitationDataSchema.parse(data)).toThrow();
  });

  test("異常系: inviteUrlが欠落している場合はエラー", () => {
    const data = {
      email: "user@example.com",
    };
    expect(() => invitationDataSchema.parse(data)).toThrow();
  });

  test("異常系: inviteUrlが無効なURLの場合はエラー", () => {
    const data = {
      email: "user@example.com",
      inviteUrl: "invalid-url",
    };
    expect(() => invitationDataSchema.parse(data)).toThrow();
  });
});

describe("notificationDataSchema", () => {
  test("正常系: 必須フィールドのみでパースできる", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
      message: "通知メッセージ",
    };
    const result = notificationDataSchema.parse(data);
    expect(result).toStrictEqual({
      ...data,
      appName: "Tumiki",
    });
  });

  test("正常系: 全フィールドを指定した場合", () => {
    const data = {
      email: "user@example.com",
      name: "山田太郎",
      title: "通知タイトル",
      message: "通知メッセージ",
      actionUrl: "https://example.com/action",
      actionText: "詳細を見る",
      appName: "MyApp",
    };
    const result = notificationDataSchema.parse(data);
    expect(result).toStrictEqual(data);
  });

  test("正常系: オプショナルフィールドを省略できる", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
      message: "通知メッセージ",
    };
    const result = notificationDataSchema.parse(data);
    expect(result.name).toStrictEqual(undefined);
    expect(result.actionUrl).toStrictEqual(undefined);
    expect(result.actionText).toStrictEqual(undefined);
  });

  test("正常系: actionUrlのみ指定した場合", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
      message: "通知メッセージ",
      actionUrl: "https://example.com/action",
    };
    const result = notificationDataSchema.parse(data);
    expect(result.actionUrl).toStrictEqual("https://example.com/action");
    expect(result.actionText).toStrictEqual(undefined);
  });

  test("正常系: actionTextのみ指定した場合", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
      message: "通知メッセージ",
      actionText: "詳細を見る",
    };
    const result = notificationDataSchema.parse(data);
    expect(result.actionUrl).toStrictEqual(undefined);
    expect(result.actionText).toStrictEqual("詳細を見る");
  });

  test("正常系: 空文字列のtitleとmessageも許可される", () => {
    const data = {
      email: "user@example.com",
      title: "",
      message: "",
    };
    const result = notificationDataSchema.parse(data);
    expect(result.title).toStrictEqual("");
    expect(result.message).toStrictEqual("");
  });

  test("異常系: emailが欠落している場合はエラー", () => {
    const data = {
      title: "通知タイトル",
      message: "通知メッセージ",
    };
    expect(() => notificationDataSchema.parse(data)).toThrow();
  });

  test("異常系: emailが無効な場合はエラー", () => {
    const data = {
      email: "invalid@",
      title: "通知タイトル",
      message: "通知メッセージ",
    };
    expect(() => notificationDataSchema.parse(data)).toThrow();
  });

  test("異常系: titleが欠落している場合はエラー", () => {
    const data = {
      email: "user@example.com",
      message: "通知メッセージ",
    };
    expect(() => notificationDataSchema.parse(data)).toThrow();
  });

  test("異常系: messageが欠落している場合はエラー", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
    };
    expect(() => notificationDataSchema.parse(data)).toThrow();
  });

  test("異常系: actionUrlが無効なURLの場合はエラー", () => {
    const data = {
      email: "user@example.com",
      title: "通知タイトル",
      message: "通知メッセージ",
      actionUrl: "not-a-valid-url",
    };
    expect(() => notificationDataSchema.parse(data)).toThrow();
  });
});
