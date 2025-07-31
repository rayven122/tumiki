import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import type {
  BaseMailOptions,
  InvitationData,
  MailResult,
} from "../types/index.js";
import { sendInvitation } from "./invitation.js";

// モック
vi.mock("react", () => ({
  createElement: vi.fn(),
}));

vi.mock("../client.js", () => ({
  getMailClient: vi.fn(),
}));

vi.mock("../emails/Invitation.js", () => ({
  Invitation: vi.fn(),
}));

describe("sendInvitation", () => {
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
      inviteUrl: "https://example.com/invite/abc123",
    };

    const result = await sendInvitation(data);

    expect(result).toStrictEqual(mockResult);

    // getMailClientが呼び出されたことを確認
    const { getMailClient } = await import("../client.js");
    expect(vi.mocked(getMailClient)).toHaveBeenCalled();

    // createElementが正しい引数で呼び出されたことを確認
    const { Invitation } = await import("../emails/Invitation.js");
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(Invitation, {
      name: undefined,
      inviteUrl: "https://example.com/invite/abc123",
      appName: "Tumiki",
      expiresAt: undefined,
    });

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "🎉 Tumikiへのご招待",
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
      inviteUrl: "https://example.com/invite/xyz789",
      appName: "MyApp",
      expiresAt: "2024-12-31",
    };

    const options: Partial<BaseMailOptions> = {
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
    };

    const result = await sendInvitation(data, options);

    expect(result).toStrictEqual(mockResult);

    // createElementが正しい引数で呼び出されたことを確認
    const { Invitation } = await import("../emails/Invitation.js");
    expect(vi.mocked(createElement)).toHaveBeenCalledWith(Invitation, {
      name: "山田太郎",
      inviteUrl: "https://example.com/invite/xyz789",
      appName: "MyApp",
      expiresAt: "2024-12-31",
    });

    // sendMailが正しい引数で呼び出されたことを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: ["cc1@example.com", "cc2@example.com"],
      bcc: "bcc@example.com",
      replyTo: "noreply@example.com",
      subject: "🎉 MyAppへのご招待",
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
      inviteUrl: "https://example.com/invite/default",
      // appNameを指定しない
    };

    const result = await sendInvitation(data);

    expect(result).toStrictEqual(mockResult);

    // デフォルトのappNameが使用されることを確認
    const { Invitation } = await import("../emails/Invitation.js");
    expect(createElement).toHaveBeenCalledWith(Invitation, {
      name: undefined,
      inviteUrl: "https://example.com/invite/default",
      appName: "Tumiki",
      expiresAt: undefined,
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: "🎉 Tumikiへのご招待",
      react: mockReactElement,
    });
  });

  test("異常系: 無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "invalid-email",
      inviteUrl: "https://example.com/invite/abc123",
    };

    await expect(sendInvitation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 無効なURLでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      inviteUrl: "not-a-valid-url",
    };

    await expect(sendInvitation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: 必須項目が不足している場合エラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      // inviteUrlが不足
    } as InvitationData;

    await expect(sendInvitation(data)).rejects.toThrow(z.ZodError);
  });

  test("異常系: optionsの無効なメールアドレスでエラーが発生する", async () => {
    const data = {
      email: "test@example.com",
      inviteUrl: "https://example.com/invite/abc123",
    };

    const options: Partial<BaseMailOptions> = {
      cc: "invalid-cc-email",
    };

    await expect(sendInvitation(data, options)).rejects.toThrow(z.ZodError);
  });

  test("異常系: メール送信が失敗した場合", async () => {
    const mockResult: MailResult = {
      success: false,
      error: "Failed to send email",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "test@example.com",
      inviteUrl: "https://example.com/invite/fail",
    };

    const result = await sendInvitation(data);

    expect(result).toStrictEqual(mockResult);
    expect(mockSendMail).toHaveBeenCalled();
  });

  test("異常系: メール送信で例外が発生した場合", async () => {
    const error = new Error("Network error");
    mockSendMail.mockRejectedValue(error);

    const data = {
      email: "test@example.com",
      inviteUrl: "https://example.com/invite/error",
    };

    await expect(sendInvitation(data)).rejects.toThrow("Network error");
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
      inviteUrl: "https://example.com/invite/empty",
    };

    const result = await sendInvitation(data);

    expect(result).toStrictEqual(mockResult);

    // 空文字のnameがそのまま渡されることを確認
    const { Invitation } = await import("../emails/Invitation.js");
    expect(createElement).toHaveBeenCalledWith(Invitation, {
      name: "",
      inviteUrl: "https://example.com/invite/empty",
      appName: "Tumiki",
      expiresAt: undefined,
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
      inviteUrl: "https://example.com/invite/long",
      appName: longAppName,
    };

    const result = await sendInvitation(data);

    expect(result).toStrictEqual(mockResult);

    // 長いappNameがそのまま使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "test@example.com",
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      subject: `🎉 ${longAppName}へのご招待`,
      react: mockReactElement,
    });
  });

  test("境界値: 複数のメールアドレスをtoに指定した場合（配列形式）", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-multiple-to",
    };
    mockSendMail.mockResolvedValue(mockResult);

    // invitationDataSchemaは単一のメールアドレスのみを受け付けるため、
    // 配列を渡すとエラーになることを確認
    const data = {
      email: ["test1@example.com", "test2@example.com"] as unknown as string,
      inviteUrl: "https://example.com/invite/multiple",
    };

    await expect(sendInvitation(data)).rejects.toThrow(z.ZodError);
  });

  test("統合: optionsのtoが無視されることを確認", async () => {
    const mockResult: MailResult = {
      success: true,
      messageId: "test-override-to",
    };
    mockSendMail.mockResolvedValue(mockResult);

    const data = {
      email: "correct@example.com",
      inviteUrl: "https://example.com/invite/override",
    };

    const options: Partial<BaseMailOptions> = {
      to: "wrong@example.com", // このtoは無視されるべき
      cc: "cc@example.com",
    };

    const result = await sendInvitation(data, options);

    expect(result).toStrictEqual(mockResult);

    // data.emailがtoとして使用されることを確認
    expect(mockSendMail).toHaveBeenCalledWith({
      to: "correct@example.com",
      cc: "cc@example.com",
      bcc: undefined,
      replyTo: undefined,
      subject: "🎉 Tumikiへのご招待",
      react: mockReactElement,
    });
  });
});
