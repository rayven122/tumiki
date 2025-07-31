import { describe, expect, test } from "vitest";

import type { OAuthProviderConfig, OAuthScope } from "./types";
import { notionConfig } from "./notion";

describe("notionConfig", () => {
  test("正常系: OAuthProviderConfig型を満たす", () => {
    const config: OAuthProviderConfig = notionConfig;
    expect(config).toStrictEqual(notionConfig);
  });

  test("正常系: name プロパティが正しく設定されている", () => {
    expect(notionConfig.name).toStrictEqual("Notion");
  });

  test("正常系: icon プロパティが正しく設定されている", () => {
    expect(notionConfig.icon).toStrictEqual("📝");
  });

  test("正常系: connection プロパティが正しく設定されている", () => {
    expect(notionConfig.connection).toStrictEqual("notion");
  });

  test("正常系: availableScopes が配列として定義されている", () => {
    expect(Array.isArray(notionConfig.availableScopes)).toStrictEqual(true);
  });

  test("正常系: availableScopes が4つのスコープを含む", () => {
    expect(notionConfig.availableScopes.length).toStrictEqual(4);
  });

  test("正常系: read-content スコープが正しく定義されている", () => {
    const readContentScope = notionConfig.availableScopes[0];
    expect(readContentScope).toStrictEqual({
      id: "read-content",
      label: "コンテンツ読み取り",
      description: "ページとデータベースの読み取り",
      scopes: ["read_content"],
    });
  });

  test("正常系: insert-content スコープが正しく定義されている", () => {
    const insertContentScope = notionConfig.availableScopes[1];
    expect(insertContentScope).toStrictEqual({
      id: "insert-content",
      label: "コンテンツ挿入",
      description: "新しいページとデータベースの作成",
      scopes: ["insert_content"],
    });
  });

  test("正常系: update-content スコープが正しく定義されている", () => {
    const updateContentScope = notionConfig.availableScopes[2];
    expect(updateContentScope).toStrictEqual({
      id: "update-content",
      label: "コンテンツ更新",
      description: "既存のページとデータベースの編集",
      scopes: ["update_content"],
    });
  });

  test("正常系: delete-content スコープが正しく定義されている", () => {
    const deleteContentScope = notionConfig.availableScopes[3];
    expect(deleteContentScope).toStrictEqual({
      id: "delete-content",
      label: "コンテンツ削除",
      description: "ページとデータベースの削除",
      scopes: ["delete_content"],
    });
  });

  test("正常系: すべてのスコープが必須フィールドを持つ", () => {
    notionConfig.availableScopes.forEach((scope: OAuthScope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(scope.id.length).toBeGreaterThan(0);
      expect(typeof scope.label).toStrictEqual("string");
      expect(scope.label.length).toBeGreaterThan(0);
      expect(typeof scope.description).toStrictEqual("string");
      expect(scope.description.length).toBeGreaterThan(0);
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.scopes.length).toBeGreaterThan(0);
    });
  });

  test("正常系: すべてのスコープのscopesプロパティが非空文字列の配列である", () => {
    notionConfig.availableScopes.forEach((scope: OAuthScope) => {
      scope.scopes.forEach((scopeValue: string) => {
        expect(typeof scopeValue).toStrictEqual("string");
        expect(scopeValue.length).toBeGreaterThan(0);
      });
    });
  });

  test("正常系: スコープIDが一意である", () => {
    const scopeIds = notionConfig.availableScopes.map((scope) => scope.id);
    const uniqueScopeIds = new Set(scopeIds);
    expect(scopeIds.length).toStrictEqual(uniqueScopeIds.size);
  });

  test("正常系: オブジェクトがreadonlyである", () => {
    const frozenConfig = Object.freeze(notionConfig);
    expect(Object.isFrozen(frozenConfig)).toStrictEqual(true);
  });

  test("正常系: availableScopesの各要素がOAuthScope型を満たす", () => {
    notionConfig.availableScopes.forEach((scope) => {
      const typedScope: OAuthScope = scope;
      expect(typedScope).toStrictEqual(scope);
    });
  });

  test("正常系: categoryプロパティが存在しない", () => {
    notionConfig.availableScopes.forEach((scope) => {
      expect("category" in scope).toStrictEqual(false);
    });
  });
});
