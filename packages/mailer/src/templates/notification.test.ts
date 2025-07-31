import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import type {
  BaseMailOptions,
  MailResult,
  NotificationData,
} from "../types/index.js";
import { sendNotification } from "./notification.js";

// モック
vi.mock("react", () => ({
  createElement: vi.fn(),
}));

vi.mock("../client.js", () => ({
  getMailClient: vi.fn(),
}));

vi.mock("../emails/Notification.js", () => ({
  Notification: vi.fn(),
}));

describe("sendNotification", () => {
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

  test("正常系: 必須項目のみでメールを送信する", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      title: "重要なお知らせ",
      message: "これはテスト通知メッセージです。",
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    // getMailClientが呼び出されたことを確認
    const { getMailClient } = await import("../client.js");
    expect(vi.mocked(getMailClient)).toHaveBeenCalled();

    // createElementが正しい引数で呼び出されたことを確認
    const { Notification } = await import("../emails/Notification.js");
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(Notification, {
      title: "重要なお知らせ",
      name: undefined,
      message: "これはテスト通知メッセージです。",
      actionUrl: undefined,
      actionText: undefined,
      appName: "Tumiki",
    });

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "重要なお知らせ",
      react: mockReactElement,
    });
  });

  test("正常系: すべてのオプションを指定してメールを送信する", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-message-id-full",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      name: "山田太郎",
      title: "アカウント更新のお知らせ",
      message: "あなたのアカウントが正常に更新されました。",
      actionUrl: "https://example.com/account",
      actionText: "アカウントを確認",
      appName: "MyApp",
    };

    const options: Partial<BaseMailOptions> = {
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
    };

    const result = await sendNotification(data, options);

    expect(result).toStrictEqual(mockResult);

    // createElementが正しい引数で呼び出されたことを確認
    const { Notification } = await import("../emails/Notification.js");
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(Notification, {
      title: "アカウント更新のお知らせ",
      name: "山田太郎",
      message: "あなたのアカウントが正常に更新されました。",
      actionUrl: "https://example.com/account",
      actionText: "アカウントを確認",
      appName: "MyApp",
    });

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
      subject: "アカウント更新のお知らせ",
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
      title: "テスト通知",
      message: "デフォルトアプリ名のテスト",
      // appNameを指定しない
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    // デフォルトのappNameが使用されることを確認
    const { Notification } = await import("../emails/Notification.js");
    expect(createElement).toHaveBeenCalledWith(Notification, {
      title: "テスト通知",
      name: undefined,
      message: "デフォルトアプリ名のテスト",
      actionUrl: undefined,
      actionText: undefined,
      appName: "Tumiki",
    });
  });

  test("正常系: actionUrlのみ指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-action-url-only",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      title: "アクションURLテスト",
      message: "URLのみ指定したテスト",
      actionUrl: "https://example.com/action",
      // actionTextを指定しない
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    const { Notification } = await import("../emails/Notification.js");
    expect(createElement).toHaveBeenCalledWith(Notification, {
      title: "アクションURLテスト",
      name: undefined,
      message: "URLのみ指定したテスト",
      actionUrl: "https://example.com/action",
      actionText: undefined,
      appName: "Tumiki",
    });
  });

  test("異常系: 無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "invalid-email",
      title: "エラーテスト",
      message: "無効なメールアドレス",
    };

    await expect(sendNotification(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 必須項目のtitleが不足している場合エラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      // titleが不足
      message: "タイトルなしのメッセージ",
    } as NotificationData;

    await expect(sendNotification(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 必須項目のmessageが不足している場合エラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      title: "メッセージなしのタイトル",
      // messageが不足
    } as NotificationData;

    await expect(sendNotification(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 無効なURLでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      title: "無効なURLテスト",
      message: "URLが無効です",
      actionUrl: "not-a-valid-url",
    };

    await expect(sendNotification(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: optionsの無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      title: "オプションエラーテスト",
      message: "CCアドレスが無効",
    };

    const options: Partial<BaseMailOptions> = {
      cc: "invalid-cc-email",
    };

    await expect(sendNotification(data, options)).rejects.toThrow(z.ZodError);
  });

  test("異常系: メール送信が失敗した場合", async () => {
    const mockResult: MailResult = {
      success: false,
      error: "Failed to send email",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      title: "送信失敗テスト",
      message: "メール送信に失敗しました",
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);
    expect(mockSendMail).toHaveBeenCalled();
  });

  test("異常系: メール送信で例外が発生した場合", async () => {
    const error = new Error("Network error");
    mockSendMail.mockRejectedValue(error);

    const data = {
      email: "test@example.com",
      title: "ネットワークエラーテスト",
      message: "ネットワークエラーが発生",
    };

    await expect(sendNotification(data)).rejects.toThrow("Network error");
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
      title: "空の名前テスト",
      message: "名前が空文字です",
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    // 空文字のnameがそのまま渡されることを確認
    const { Notification } = await import("../emails/Notification.js");
    expect(createElement).toHaveBeenCalledWith(Notification, {
      title: "空の名前テスト",
      name: "",
      message: "名前が空文字です",
      actionUrl: undefined,
      actionText: undefined,
      appName: "Tumiki",
    });
  });

  test("境界値: 非常に長いtitleを指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-long-title",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const longTitle = "タ".repeat(100);
    const data = {
      email: "test@example.com",
      title: longTitle,
      message: "非常に長いタイトルのテスト",
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    // 長いタイトルがそのまま使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: longTitle,
      react: mockReactElement,
    });
  });

  test("境界値: 非常に長いmessageを指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-long-message",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const longMessage = "メ".repeat(1000);
    const data = {
      email: "test@example.com",
      title: "長いメッセージテスト",
      message: longMessage,
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    const { Notification } = await import("../emails/Notification.js");
    expect(createElement).toHaveBeenCalledWith(Notification, {
      title: "長いメッセージテスト",
      name: undefined,
      message: longMessage,
      actionUrl: undefined,
      actionText: undefined,
      appName: "Tumiki",
    });
  });

  test("境界値: 空文字のactionTextを指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-empty-action-text",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      title: "空のアクションテキスト",
      message: "アクションテキストが空です",
      actionUrl: "https://example.com/action",
      actionText: "",
    };

    const result = await sendNotification(data);

    expect(result).toStrictEqual(mockResult);

    const { Notification } = await import("../emails/Notification.js");
    expect(createElement).toHaveBeenCalledWith(Notification, {
      title: "空のアクションテキスト",
      name: undefined,
      message: "アクションテキストが空です",
      actionUrl: "https://example.com/action",
      actionText: "",
      appName: "Tumiki",
    });
  });

  test("統合: optionsのtoが無視されることを確認", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-override-to",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "correct@example.com",
      title: "アドレス上書きテスト",
      message: "正しいアドレスが使用されます",
    };

    const options: Partial<BaseMailOptions> = {
      to: "wrong@example.com", // このtoは無視されるべき
      cc: "cc@example.com",
    };

    const result = await sendNotification(data, options);

    expect(result).toStrictEqual(mockResult);

    // data.emailがtoとして使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "correct@example.com",
      cc: "cc@example.com",
      bcc: undefined,
      replyTo: undefined,
      subject: "アドレス上書きテスト",
      react: mockReactElement,
    });
  });

  test("統合: 複数のCCアドレスを配列で指定した場合", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-multiple-cc",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      title: "複数CCテスト",
      message: "複数のCCアドレスを指定",
    };

    const options: Partial<BaseMailOptions> = {
      cc: ["cc1@example.com", "cc2@example.com", "cc3@example.com"],
    };

    const result = await sendNotification(data, options);

    expect(result).toStrictEqual(mockResult);

    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com", "cc3@example.com"],
      bcc: undefined,
      replyTo: undefined,
      subject: "複数CCテスト",
      react: mockReactElement,
    });
  });
});
