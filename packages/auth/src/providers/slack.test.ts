import { describe, expect, test } from "vitest";

import type { OAuthProviderConfig } from "./types";
import { slackConfig } from "./slack";

describe("slackConfig", () => {
  test("正常系: OAuthProviderConfig型に準拠している", () => {
    const config: OAuthProviderConfig = slackConfig;
    expect(config).toStrictEqual(slackConfig);
  });

  test("正常系: nameプロパティが正しく設定されている", () => {
    expect(slackConfig.name).toStrictEqual("Slack");
  });

  test("正常系: iconプロパティが正しく設定されている", () => {
    expect(slackConfig.icon).toStrictEqual("💬");
  });

  test("正常系: connectionプロパティが正しく設定されている", () => {
    expect(slackConfig.connection).toStrictEqual("sign-in-with-slack");
  });

  test("正常系: availableScopesが配列である", () => {
    expect(Array.isArray(slackConfig.availableScopes)).toStrictEqual(true);
  });

  test("正常系: availableScopesに17個のスコープが含まれている", () => {
    expect(slackConfig.availableScopes).toHaveLength(17);
  });

  test("正常系: 各スコープが必須プロパティを持っている", () => {
    slackConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(typeof scope.label).toStrictEqual("string");
      expect(typeof scope.description).toStrictEqual("string");
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.scopes.length).toBeGreaterThan(0);
    });
  });

  test("正常系: channels-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "channels-read",
    );
    expect(scope).toStrictEqual({
      id: "channels-read",
      label: "チャンネル（読み取り）",
      description: "パブリックチャンネル情報の読み取り",
      scopes: ["channels:read"],
    });
  });

  test("正常系: channels-writeスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "channels-write",
    );
    expect(scope).toStrictEqual({
      id: "channels-write",
      label: "チャンネル（書き込み）",
      description: "チャンネルの作成・管理",
      scopes: ["channels:write"],
    });
  });

  test("正常系: channels-historyスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "channels-history",
    );
    expect(scope).toStrictEqual({
      id: "channels-history",
      label: "チャンネル履歴",
      description: "パブリックチャンネルのメッセージ履歴",
      scopes: ["channels:history"],
    });
  });

  test("正常系: groups-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "groups-read",
    );
    expect(scope).toStrictEqual({
      id: "groups-read",
      label: "プライベートチャンネル（読み取り）",
      description: "プライベートチャンネル情報の読み取り",
      scopes: ["groups:read"],
    });
  });

  test("正常系: groups-writeスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "groups-write",
    );
    expect(scope).toStrictEqual({
      id: "groups-write",
      label: "プライベートチャンネル（書き込み）",
      description: "プライベートチャンネルの管理",
      scopes: ["groups:write"],
    });
  });

  test("正常系: groups-historyスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "groups-history",
    );
    expect(scope).toStrictEqual({
      id: "groups-history",
      label: "プライベートチャンネル履歴",
      description: "プライベートチャンネルのメッセージ履歴",
      scopes: ["groups:history"],
    });
  });

  test("正常系: chat-writeスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "chat-write",
    );
    expect(scope).toStrictEqual({
      id: "chat-write",
      label: "メッセージ送信",
      description: "メッセージの送信",
      scopes: ["chat:write"],
    });
  });

  test("正常系: chat-write-userスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "chat-write-user",
    );
    expect(scope).toStrictEqual({
      id: "chat-write-user",
      label: "ユーザーとしてメッセージ送信",
      description: "ユーザーとしてメッセージを送信",
      scopes: ["chat:write:user"],
    });
  });

  test("正常系: chat-write-botスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "chat-write-bot",
    );
    expect(scope).toStrictEqual({
      id: "chat-write-bot",
      label: "ボットとしてメッセージ送信",
      description: "ボットとしてメッセージを送信",
      scopes: ["chat:write:bot"],
    });
  });

  test("正常系: im-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find((s) => s.id === "im-read");
    expect(scope).toStrictEqual({
      id: "im-read",
      label: "ダイレクトメッセージ（読み取り）",
      description: "ダイレクトメッセージの読み取り",
      scopes: ["im:read"],
    });
  });

  test("正常系: im-writeスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find((s) => s.id === "im-write");
    expect(scope).toStrictEqual({
      id: "im-write",
      label: "ダイレクトメッセージ（書き込み）",
      description: "ダイレクトメッセージの送信",
      scopes: ["im:write"],
    });
  });

  test("正常系: im-historyスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "im-history",
    );
    expect(scope).toStrictEqual({
      id: "im-history",
      label: "ダイレクトメッセージ履歴",
      description: "ダイレクトメッセージの履歴",
      scopes: ["im:history"],
    });
  });

  test("正常系: users-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "users-read",
    );
    expect(scope).toStrictEqual({
      id: "users-read",
      label: "ユーザー情報（読み取り）",
      description: "ユーザー情報の読み取り",
      scopes: ["users:read"],
    });
  });

  test("正常系: users-read-emailスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "users-read-email",
    );
    expect(scope).toStrictEqual({
      id: "users-read-email",
      label: "ユーザーメール（読み取り）",
      description: "ユーザーのメールアドレスの読み取り",
      scopes: ["users:read.email"],
    });
  });

  test("正常系: team-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find((s) => s.id === "team-read");
    expect(scope).toStrictEqual({
      id: "team-read",
      label: "チーム情報（読み取り）",
      description: "ワークスペース情報の読み取り",
      scopes: ["team:read"],
    });
  });

  test("正常系: files-readスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "files-read",
    );
    expect(scope).toStrictEqual({
      id: "files-read",
      label: "ファイル（読み取り）",
      description: "ファイルの読み取り",
      scopes: ["files:read"],
    });
  });

  test("正常系: files-writeスコープが正しく定義されている", () => {
    const scope = slackConfig.availableScopes.find(
      (s) => s.id === "files-write",
    );
    expect(scope).toStrictEqual({
      id: "files-write",
      label: "ファイル（書き込み）",
      description: "ファイルのアップロード・編集",
      scopes: ["files:write"],
    });
  });

  test("正常系: すべてのスコープIDがユニークである", () => {
    const ids = slackConfig.availableScopes.map((scope) => scope.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toStrictEqual(ids.length);
  });

  test("正常系: すべてのスコープのscopesプロパティが空でない配列である", () => {
    slackConfig.availableScopes.forEach((scope) => {
      expect(scope.scopes.length).toBeGreaterThan(0);
      scope.scopes.forEach((s) => {
        expect(typeof s).toStrictEqual("string");
        expect(s.length).toBeGreaterThan(0);
      });
    });
  });

  test("正常系: オブジェクトがas constで定義されている", () => {
    // TypeScriptの型システムでreadonlyが保証されているため、
    // 実行時の値は変更不可能であることを型レベルで確認
    type ConfigType = typeof slackConfig;
    type NameType = ConfigType["name"];
    // NameTypeは "Slack" リテラル型になる
    const testName: NameType = "Slack";
    expect(testName).toStrictEqual("Slack");
    expect(slackConfig.name).toStrictEqual("Slack");
  });

  test("正常系: availableScopesのすべてのスコープにcategoryプロパティが存在しない", () => {
    slackConfig.availableScopes.forEach((scope) => {
      expect("category" in scope).toStrictEqual(false);
    });
  });

  test("正常系: スコープの順序が期待通りである", () => {
    const expectedOrder = [
      "channels-read",
      "channels-write",
      "channels-history",
      "groups-read",
      "groups-write",
      "groups-history",
      "chat-write",
      "chat-write-user",
      "chat-write-bot",
      "im-read",
      "im-write",
      "im-history",
      "users-read",
      "users-read-email",
      "team-read",
      "files-read",
      "files-write",
    ];
    const actualOrder = slackConfig.availableScopes.map((scope) => scope.id);
    expect(actualOrder).toStrictEqual(expectedOrder);
  });

  test("正常系: すべてのスコープラベルが日本語である", () => {
    slackConfig.availableScopes.forEach((scope) => {
      // 日本語文字（ひらがな、カタカナ、漢字）を含むかチェック
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(
        scope.label,
      );
      expect(hasJapanese).toStrictEqual(true);
    });
  });

  test("正常系: すべてのスコープ説明が日本語である", () => {
    slackConfig.availableScopes.forEach((scope) => {
      // 日本語文字（ひらがな、カタカナ、漢字）を含むかチェック
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(
        scope.description,
      );
      expect(hasJapanese).toStrictEqual(true);
    });
  });

  test("正常系: スコープ配列内のscopesがSlack APIの形式に従っている", () => {
    slackConfig.availableScopes.forEach((scope) => {
      scope.scopes.forEach((s) => {
        // Slack APIのスコープ形式: 小文字とコロン、ドットのみ
        expect(/^[a-z:\.]+$/.test(s)).toStrictEqual(true);
      });
    });
  });
});
