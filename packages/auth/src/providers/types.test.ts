import { describe, expect, test } from "vitest";

import type { OAuthProviderConfig, OAuthScope } from "./types";

describe("types", () => {
  test("OAuthScope型が正しく定義されている", () => {
    // OAuthScope型のオブジェクトを作成
    const scope: OAuthScope = {
      id: "read-profile",
      label: "プロフィール読み取り",
      description: "ユーザーのプロフィール情報を読み取ります",
      scopes: ["profile", "email"],
    };

    expect(scope.id).toStrictEqual("read-profile");
    expect(scope.label).toStrictEqual("プロフィール読み取り");
    expect(scope.description).toStrictEqual(
      "ユーザーのプロフィール情報を読み取ります",
    );
    expect(scope.scopes).toStrictEqual(["profile", "email"]);
    expect(scope.category).toBeUndefined();
  });

  test("OAuthScope型にカテゴリを含めることができる", () => {
    // カテゴリを含むOAuthScope型のオブジェクトを作成
    const scopeWithCategory: OAuthScope = {
      id: "write-posts",
      label: "投稿書き込み",
      description: "ブログ投稿を作成・編集します",
      scopes: ["posts:write", "posts:delete"],
      category: "コンテンツ管理",
    };

    expect(scopeWithCategory.id).toStrictEqual("write-posts");
    expect(scopeWithCategory.label).toStrictEqual("投稿書き込み");
    expect(scopeWithCategory.description).toStrictEqual(
      "ブログ投稿を作成・編集します",
    );
    expect(scopeWithCategory.scopes).toStrictEqual([
      "posts:write",
      "posts:delete",
    ]);
    expect(scopeWithCategory.category).toStrictEqual("コンテンツ管理");
  });

  test("OAuthProviderConfig型が正しく定義されている", () => {
    // OAuthProviderConfig型のオブジェクトを作成
    const providerConfig: OAuthProviderConfig = {
      name: "GitHub",
      icon: "github-icon.svg",
      connection: "github",
      availableScopes: [
        {
          id: "repo",
          label: "リポジトリアクセス",
          description: "リポジトリの読み取りと書き込み",
          scopes: ["repo"],
        },
        {
          id: "user",
          label: "ユーザー情報",
          description: "ユーザープロフィールの読み取り",
          scopes: ["user:email", "read:user"],
        },
      ],
    };

    expect(providerConfig.name).toStrictEqual("GitHub");
    expect(providerConfig.icon).toStrictEqual("github-icon.svg");
    expect(providerConfig.connection).toStrictEqual("github");
    expect(providerConfig.availableScopes).toHaveLength(2);
    expect(providerConfig.availableScopes[0]!.id).toStrictEqual("repo");
    expect(providerConfig.availableScopes[1]!.id).toStrictEqual("user");
  });

  test("OAuthProviderConfigに空のavailableScopesを設定できる", () => {
    // 空のスコープ配列を持つプロバイダー設定
    const emptyScopes: OAuthProviderConfig = {
      name: "CustomProvider",
      icon: "custom.png",
      connection: "custom-oauth2",
      availableScopes: [],
    };

    expect(emptyScopes.name).toStrictEqual("CustomProvider");
    expect(emptyScopes.icon).toStrictEqual("custom.png");
    expect(emptyScopes.connection).toStrictEqual("custom-oauth2");
    expect(emptyScopes.availableScopes).toStrictEqual([]);
    expect(emptyScopes.availableScopes).toHaveLength(0);
  });

  test("複雑なOAuthProviderConfig構造を作成できる", () => {
    // 複数のカテゴリとスコープを持つ複雑な設定
    const complexConfig: OAuthProviderConfig = {
      name: "Google",
      icon: "google-icon.svg",
      connection: "google-oauth2",
      availableScopes: [
        {
          id: "basic-profile",
          label: "基本プロフィール",
          description: "名前とメールアドレス",
          scopes: ["openid", "profile", "email"],
          category: "基本情報",
        },
        {
          id: "calendar-read",
          label: "カレンダー読み取り",
          description: "カレンダーイベントの表示",
          scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
          category: "カレンダー",
        },
        {
          id: "drive-full",
          label: "ドライブフルアクセス",
          description: "Google Driveの完全なアクセス",
          scopes: ["https://www.googleapis.com/auth/drive"],
          category: "ストレージ",
        },
      ],
    };

    expect(complexConfig.availableScopes).toHaveLength(3);

    // 各スコープのカテゴリを確認
    const categories = complexConfig.availableScopes
      .map((scope) => scope.category)
      .filter(Boolean);

    expect(categories).toStrictEqual(["基本情報", "カレンダー", "ストレージ"]);

    // スコープ配列の内容を確認
    const allScopes = complexConfig.availableScopes.flatMap(
      (scope) => scope.scopes,
    );

    expect(allScopes).toContain("openid");
    expect(allScopes).toContain(
      "https://www.googleapis.com/auth/calendar.readonly",
    );
    expect(allScopes).toContain("https://www.googleapis.com/auth/drive");
  });
});
