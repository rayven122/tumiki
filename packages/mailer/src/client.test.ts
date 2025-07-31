import type { Transporter } from "nodemailer";
import type { ReactElement } from "react";
// nodemailerのインポート
import nodemailer from "nodemailer";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { MailConfig, SendMailOptions } from "./types";
import {
  createMailClient,
  getMailClient,
  MailClient,
  resetMailClient,
} from "./client";

// nodemailerのモック
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

// @react-email/renderのモック
vi.mock("@react-email/render", () => ({
  render: vi.fn(),
}));

describe("MailClient", () => {
  const mockConfig: MailConfig = {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@example.com",
      pass: "password123",
    },
    from: "sender@example.com",
  };

  const mockVerify = vi.fn();
  const mockSendMail = vi.fn();
  const mockClose = vi.fn();

  const mockTransporter = {
    verify: mockVerify,
    sendMail: mockSendMail,
    close: mockClose,
  } as unknown as Transporter;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(nodemailer.createTransport).mockReturnValue(
      mockTransporter as ReturnType<typeof nodemailer.createTransport>,
    );

    // グローバルクライアントをリセット
    resetMailClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    test("正常系: 有効な設定でインスタンスを作成する", () => {
      const client = new MailClient(mockConfig);
      expect(client).toBeInstanceOf(MailClient);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        secure: mockConfig.secure,
        auth: mockConfig.auth,
      });
    });

    test("異常系: 無効な設定でエラーが発生する", () => {
      const invalidConfig = {
        host: "",
        port: "invalid" as unknown as number, // 数値でない
        auth: {
          user: "test@example.com",
          pass: "password123",
        },
        from: "invalid-email", // 無効なメールアドレス
      };

      expect(() => new MailClient(invalidConfig as MailConfig)).toThrow();
    });

    test("境界値: secureが未定義の場合、デフォルト値falseが使用される", () => {
      const { secure, ...configWithoutSecure } = mockConfig;
      void secure; // Unused but needed for destructuring

      const client = new MailClient(configWithoutSecure as MailConfig);
      expect(client).toBeInstanceOf(MailClient);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: mockConfig.host,
        port: mockConfig.port,
        secure: false,
        auth: mockConfig.auth,
      });
    });
  });

  describe("verify", () => {
    test("正常系: トランスポーターの検証が成功する", async () => {
      mockVerify.mockResolvedValue(true);

      const client = new MailClient(mockConfig);
      const result = await client.verify();

      expect(result).toStrictEqual(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    test("異常系: トランスポーターの検証が失敗する", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Mock console.error
        });
      mockVerify.mockRejectedValue(new Error("Verification failed"));

      const client = new MailClient(mockConfig);
      const result = await client.verify();

      expect(result).toStrictEqual(false);
      expect(mockVerify).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Mail transporter verification failed:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("sendMail", () => {
    test("正常系: HTMLとテキストを指定してメールを送信する", async () => {
      const messageInfo = { messageId: "test-message-id" };
      mockSendMail.mockResolvedValue(messageInfo);

      const options: SendMailOptions = {
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        text: "Test Text",
      };

      const client = new MailClient(mockConfig);
      const result = await client.sendMail(options);

      expect(result).toStrictEqual({
        success: true,
        messageId: "test-message-id",
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: mockConfig.from,
        to: options.to,
        cc: undefined,
        bcc: undefined,
        replyTo: undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    });

    test("正常系: Reactコンポーネントからメールを送信する", async () => {
      const { render } = await import("@react-email/render");
      vi.mocked(render).mockImplementation(async (component, options?) => {
        if (options?.plainText) {
          return "Plain text content";
        }
        return "<p>HTML content</p>";
      });

      const messageInfo = { messageId: "react-message-id" };
      mockSendMail.mockResolvedValue(messageInfo);

      const mockReactElement = {} as ReactElement;
      const options: SendMailOptions = {
        to: "recipient@example.com",
        subject: "React Email",
        react: mockReactElement,
      };

      const client = new MailClient(mockConfig);
      const result = await client.sendMail(options);

      expect(result).toStrictEqual({
        success: true,
        messageId: "react-message-id",
      });

      expect(render).toHaveBeenCalledWith(mockReactElement);
      expect(render).toHaveBeenCalledWith(mockReactElement, {
        plainText: true,
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: mockConfig.from,
        to: options.to,
        cc: undefined,
        bcc: undefined,
        replyTo: undefined,
        subject: options.subject,
        html: "<p>HTML content</p>",
        text: "Plain text content",
      });
    });

    test("正常系: 複数の宛先とCCおよびBCCを指定してメールを送信する", async () => {
      const messageInfo = { messageId: "multi-recipient-id" };
      mockSendMail.mockResolvedValue(messageInfo);

      const options: SendMailOptions = {
        to: ["recipient1@example.com", "recipient2@example.com"],
        cc: "cc@example.com",
        bcc: ["bcc1@example.com", "bcc2@example.com"],
        replyTo: "replyto@example.com",
        subject: "Multi Recipient",
        text: "Test content",
      };

      const client = new MailClient(mockConfig);
      const result = await client.sendMail(options);

      expect(result).toStrictEqual({
        success: true,
        messageId: "multi-recipient-id",
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: mockConfig.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        html: undefined,
        text: options.text,
      });
    });

    test("異常系: メール送信時にエラーが発生する", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Mock console.error
        });
      const sendError = new Error("Send failed");
      mockSendMail.mockRejectedValue(sendError);

      const options: SendMailOptions = {
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test content",
      };

      const client = new MailClient(mockConfig);
      const result = await client.sendMail(options);

      expect(result).toStrictEqual({
        success: false,
        error: "Send failed",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send email:",
        sendError,
      );
      consoleErrorSpy.mockRestore();
    });

    test("異常系: 非Errorオブジェクトがスローされた場合", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Mock console.error
        });
      mockSendMail.mockRejectedValue("String error");

      const options: SendMailOptions = {
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test content",
      };

      const client = new MailClient(mockConfig);
      const result = await client.sendMail(options);

      expect(result).toStrictEqual({
        success: false,
        error: "Unknown error",
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send email:",
        "String error",
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("sendBulkMail", () => {
    test("正常系: 複数のメールを一括送信する", async () => {
      const messageIds = ["msg1", "msg2", "msg3"];
      mockSendMail
        .mockResolvedValueOnce({ messageId: messageIds[0] })
        .mockResolvedValueOnce({ messageId: messageIds[1] })
        .mockResolvedValueOnce({ messageId: messageIds[2] });

      const emails: SendMailOptions[] = [
        { to: "user1@example.com", subject: "Subject 1", text: "Text 1" },
        { to: "user2@example.com", subject: "Subject 2", text: "Text 2" },
        { to: "user3@example.com", subject: "Subject 3", text: "Text 3" },
      ];

      const client = new MailClient(mockConfig);
      const results = await client.sendBulkMail(emails);

      expect(results).toStrictEqual([
        { success: true, messageId: "msg1" },
        { success: true, messageId: "msg2" },
        { success: true, messageId: "msg3" },
      ]);

      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });

    test("正常系: 空の配列を渡した場合", async () => {
      const client = new MailClient(mockConfig);
      const results = await client.sendBulkMail([]);

      expect(results).toStrictEqual([]);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test("異常系: 一部のメール送信が失敗する", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Mock console.error
        });
      mockSendMail
        .mockResolvedValueOnce({ messageId: "msg1" })
        .mockRejectedValueOnce(new Error("Send failed"))
        .mockResolvedValueOnce({ messageId: "msg3" });

      const emails: SendMailOptions[] = [
        { to: "user1@example.com", subject: "Subject 1", text: "Text 1" },
        { to: "user2@example.com", subject: "Subject 2", text: "Text 2" },
        { to: "user3@example.com", subject: "Subject 3", text: "Text 3" },
      ];

      const client = new MailClient(mockConfig);
      const results = await client.sendBulkMail(emails);

      expect(results).toStrictEqual([
        { success: true, messageId: "msg1" },
        { success: false, error: "Send failed" },
        { success: true, messageId: "msg3" },
      ]);

      expect(mockSendMail).toHaveBeenCalledTimes(3);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("close", () => {
    test("正常系: トランスポーターを閉じる", () => {
      const client = new MailClient(mockConfig);
      client.close();

      expect(mockClose).toHaveBeenCalled();
    });
  });
});

describe("createMailClient", () => {
  const mockConfig: MailConfig = {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@example.com",
      pass: "password123",
    },
    from: "sender@example.com",
  };

  const mockVerify2 = vi.fn();
  const mockSendMail2 = vi.fn();
  const mockClose2 = vi.fn();

  const mockTransporter = {
    verify: mockVerify2,
    sendMail: mockSendMail2,
    close: mockClose2,
  } as unknown as Transporter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodemailer.createTransport).mockReturnValue(
      mockTransporter as ReturnType<typeof nodemailer.createTransport>,
    );
    resetMailClient();
  });

  test("正常系: 初回呼び出しで新しいクライアントを作成する", () => {
    const client1 = createMailClient(mockConfig);
    expect(client1).toBeInstanceOf(MailClient);
  });

  test("正常系: 2回目以降の呼び出しで同じクライアントを返す", () => {
    const client1 = createMailClient(mockConfig);
    const client2 = createMailClient(mockConfig);

    expect(client1).toBe(client2);
  });

  test("正常系: リセット後は新しいクライアントを作成する", () => {
    const client1 = createMailClient(mockConfig);
    resetMailClient();
    const client2 = createMailClient(mockConfig);

    expect(client1).not.toBe(client2);
  });
});

describe("getMailClient", () => {
  const mockConfig: MailConfig = {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@example.com",
      pass: "password123",
    },
    from: "sender@example.com",
  };

  const mockVerify3 = vi.fn();
  const mockSendMail3 = vi.fn();
  const mockClose3 = vi.fn();

  const mockTransporter = {
    verify: mockVerify3,
    sendMail: mockSendMail3,
    close: mockClose3,
  } as unknown as Transporter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodemailer.createTransport).mockReturnValue(
      mockTransporter as ReturnType<typeof nodemailer.createTransport>,
    );
    resetMailClient();
  });

  test("正常系: 初期化されたクライアントを返す", () => {
    createMailClient(mockConfig);
    const client = getMailClient();

    expect(client).toBeInstanceOf(MailClient);
  });

  test("異常系: クライアントが初期化されていない場合エラーが発生する", () => {
    expect(() => getMailClient()).toThrow(
      "Mail client is not initialized. Call createMailClient first.",
    );
  });

  test("正常系: createMailClientで作成したクライアントと同じインスタンスを返す", () => {
    const createdClient = createMailClient(mockConfig);
    const retrievedClient = getMailClient();

    expect(createdClient).toBe(retrievedClient);
  });
});

describe("resetMailClient", () => {
  const mockConfig: MailConfig = {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: "test@example.com",
      pass: "password123",
    },
    from: "sender@example.com",
  };

  const mockVerify4 = vi.fn();
  const mockSendMail4 = vi.fn();
  const mockClose4 = vi.fn();

  const mockTransporter = {
    verify: mockVerify4,
    sendMail: mockSendMail4,
    close: mockClose4,
  } as unknown as Transporter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(nodemailer.createTransport).mockReturnValue(
      mockTransporter as ReturnType<typeof nodemailer.createTransport>,
    );
    resetMailClient();
  });

  test("正常系: クライアントが存在する場合、閉じてnullに設定する", () => {
    createMailClient(mockConfig);
    resetMailClient();

    expect(mockClose4).toHaveBeenCalled();
    expect(() => getMailClient()).toThrow();
  });

  test("正常系: クライアントが存在しない場合、エラーが発生しない", () => {
    expect(() => resetMailClient()).not.toThrow();
  });

  test("正常系: 複数回呼び出してもエラーが発生しない", () => {
    createMailClient(mockConfig);
    resetMailClient();
    resetMailClient();

    expect(mockClose4).toHaveBeenCalledTimes(1);
  });
});
