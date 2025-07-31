import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import type {
  BaseMailOptions,
  MailResult,
  WaitingListData,
} from "../types/index.js";
import { sendWaitingListConfirmation } from "./waiting-list.js";

type Language = "ja" | "en";

// モック
vi.mock("react", () => ({
  createElement: vi.fn(),
}));

vi.mock("../client.js", () => ({
  getMailClient: vi.fn(),
}));

vi.mock("../emails/WaitingListConfirmation.js", () => ({
  WaitingListConfirmation: vi.fn(),
}));

vi.mock("../emails/WaitingListConfirmationEN.js", () => ({
  WaitingListConfirmationEN: vi.fn(),
}));

describe("sendWaitingListConfirmation", () => {
  const mockSendMail = vi.fn();
  const mockMailClient = {
    sendMail: mockSendMail,
  };

  const mockReactElement = {
    type: "div",
    props: {},
    key: null,
  } as React.ReactElement<
    Record<string, never>,
    string | React.JSXElementConstructor<unknown>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(createElement).mockReturnValue(mockReactElement);
    const { getMailClient } = await import("../client.js");
    vi.mocked(getMailClient).mockReturnValue(
      mockMailClient as unknown as ReturnType<typeof getMailClient>,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("正常系: 日本語で必須項目のみでメールを送信する", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id-ja",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/abc123",
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // getMailClientが呼び出されたことを確認
    const { getMailClient } = await import("../client.js");
    expect(vi.mocked(getMailClient)).toHaveBeenCalled();

    // 日本語コンポーネントが使用されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmation,
      {
        name: undefined,
        confirmUrl: "https://example.com/confirm/abc123",
        appName: "Tumiki",
      },
    );

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "Tumiki - ウェイティングリスト登録完了",
      react: mockReactElement,
    });
  });

  test("正常系: 英語で必須項目のみでメールを送信する", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id-en",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/xyz789",
      language: "en" as const,
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // 英語コンポーネントが使用されることを確認
    const { WaitingListConfirmationEN } = await import(
      "../emails/WaitingListConfirmationEN.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmationEN,
      {
        name: undefined,
        confirmUrl: "https://example.com/confirm/xyz789",
        appName: "Tumiki",
      },
    );

    // 英語の件名が使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "Tumiki - Waiting List Registration Complete",
      react: mockReactElement,
    });
  });

  test("正常系: すべてのオプションを指定してメールを送信する（日本語）", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id-full-ja",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      name: "山田太郎",
      confirmUrl: "https://example.com/confirm/full",
      appName: "MyApp",
      language: "ja" as const,
    };

    const options: Partial<BaseMailOptions> = {
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
    };

    const result = await sendWaitingListConfirmation(data, options);

    expect(result).toStrictEqual(mockResult);

    // 日本語コンポーネントが使用されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmation,
      {
        name: "山田太郎",
        confirmUrl: "https://example.com/confirm/full",
        appName: "MyApp",
      },
    );

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
      subject: "MyApp - ウェイティングリスト登録完了",
      react: mockReactElement,
    });
  });

  test("正常系: すべてのオプションを指定してメールを送信する（英語）", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id-full-en",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      name: "John Doe",
      confirmUrl: "https://example.com/confirm/full-en",
      appName: "MyApp",
      language: "en" as const,
    };

    const options: Partial<BaseMailOptions> = {
      cc: "cc@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
      replyTo: "support@example.com",
    };

    const result = await sendWaitingListConfirmation(data, options);

    expect(result).toStrictEqual(mockResult);

    // 英語コンポーネントが使用されることを確認
    const { WaitingListConfirmationEN } = await import(
      "../emails/WaitingListConfirmationEN.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmationEN,
      {
        name: "John Doe",
        confirmUrl: "https://example.com/confirm/full-en",
        appName: "MyApp",
      },
    );

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: "cc@example.com",
      bcc: ["bcc1@example.com", "bcc2@example.com"],
      replyTo: "support@example.com",
      subject: "MyApp - Waiting List Registration Complete",
      react: mockReactElement,
    });
  });

  test("正常系: languageを指定しない場合はデフォルトで日本語が使用される", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-default-lang",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/default",
      // languageを指定しない
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // 日本語コンポーネントが使用されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmation,
      {
        name: undefined,
        confirmUrl: "https://example.com/confirm/default",
        appName: "Tumiki",
      },
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "Tumiki - ウェイティングリスト登録完了",
      react: mockReactElement,
    });
  });

  test("正常系: appNameがデフォルト値を使用する", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-default-app",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/default-app",
      // appNameを指定しない
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // デフォルトのappNameが使用されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(createElement).toHaveBeenCalledWith(WaitingListConfirmation, {
      name: undefined,
      confirmUrl: "https://example.com/confirm/default-app",
      appName: "Tumiki",
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "Tumiki - ウェイティングリスト登録完了",
      react: mockReactElement,
    });
  });

  test("異常系: 無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "invalid-email",
      confirmUrl: "https://example.com/confirm/abc123",
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 無効なURLでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      confirmUrl: "not-a-valid-url",
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 必須項目が不足している場合エラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      // confirmUrlが不足
    } as WaitingListData;

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 無効な言語コードでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/invalid-lang",
      language: "fr" as unknown as Language, // 無効な言語コード
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: optionsの無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/abc123",
    };

    const options: Partial<BaseMailOptions> = {
      cc: "invalid-cc-email",
    };

    await expect(sendWaitingListConfirmation(data, options)).rejects.toThrow(
      z.ZodError,
    );
  });

  test("異常系: メール送信が失敗した場合", async () => {
    const mockResult: MailResult = {
      success: false,
      error: "Failed to send email",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/fail",
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);
    expect(mockSendMail).toHaveBeenCalled();
  });

  test("異常系: メール送信で例外が発生した場合", async () => {
    const error = new Error("Network error");
    mockSendMail.mockRejectedValue(error);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/error",
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(
      "Network error",
    );
  });

  test("境界値: 空文字のnameを指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-empty-name",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      name: "",
      confirmUrl: "https://example.com/confirm/empty",
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // 空文字のnameがそのまま渡されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(createElement).toHaveBeenCalledWith(WaitingListConfirmation, {
      name: "",
      confirmUrl: "https://example.com/confirm/empty",
      appName: "Tumiki",
    });
  });

  test("境界値: 非常に長いappNameを指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-long-appname",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const longAppName = "A".repeat(100);
    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/long",
      appName: longAppName,
    };

    const result = await sendWaitingListConfirmation(data);

    expect(result).toStrictEqual(mockResult);

    // 長いappNameがそのまま使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: `${longAppName} - ウェイティングリスト登録完了`,
      react: mockReactElement,
    });
  });

  test("境界値: 複数のメールアドレスをtoに指定した場合（配列形式）", async () => {
    // waitingListDataSchemaは単一のメールアドレスのみを受け付けるため、
    // 配列を渡すとエラーになることを確認
    const data = {
      email: ["test1@example.com", "test2@example.com"] as unknown as string,
      confirmUrl: "https://example.com/confirm/multiple",
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(z.ZodError);
  });

  test("統合: optionsのtoが無視されることを確認", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-override-to",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "correct@example.com",
      confirmUrl: "https://example.com/confirm/override",
    };

    const options: Partial<BaseMailOptions> = {
      to: "wrong@example.com", // このtoは無視されるべき
      cc: "cc@example.com",
    };

    const result = await sendWaitingListConfirmation(data, options);

    expect(result).toStrictEqual(mockResult);

    // data.emailがtoとして使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "correct@example.com",
      cc: "cc@example.com",
      bcc: undefined,
      replyTo: undefined,
      subject: "Tumiki - ウェイティングリスト登録完了",
      react: mockReactElement,
    });
  });

  test("言語切り替え: jaを明示的に指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-explicit-ja",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/ja",
      language: "ja" as const,
    };

    await sendWaitingListConfirmation(data);

    // 日本語コンポーネントが使用されることを確認
    const { WaitingListConfirmation } = await import(
      "../emails/WaitingListConfirmation.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmation,
      expect.any(Object),
    );

    // 日本語の件名が使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Tumiki - ウェイティングリスト登録完了",
      }),
    );
  });

  test("言語切り替え: enを明示的に指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-explicit-en",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/en",
      language: "en" as const,
    };

    await sendWaitingListConfirmation(data);

    // 英語コンポーネントが使用されることを確認
    const { WaitingListConfirmationEN } = await import(
      "../emails/WaitingListConfirmationEN.js"
    );
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(
      WaitingListConfirmationEN,
      expect.any(Object),
    );

    // 英語の件名が使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Tumiki - Waiting List Registration Complete",
      }),
    );
  });

  test("getMailClientがエラーを投げる場合", async () => {
    const { getMailClient } = await import("../client.js");
    vi.mocked(getMailClient).mockImplementation(() => {
      throw new Error("Mail client is not initialized");
    });

    const data = {
      email: "test@example.com",
      confirmUrl: "https://example.com/confirm/no-client",
    };

    await expect(sendWaitingListConfirmation(data)).rejects.toThrow(
      "Mail client is not initialized",
    );
  });
});
