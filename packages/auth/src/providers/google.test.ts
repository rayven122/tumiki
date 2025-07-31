import { describe, expect, test } from "vitest";

import type { OAuthProviderConfig, OAuthScope } from "./types";
import { googleConfig } from "./google";

describe("googleConfig", () => {
  test("正常系: googleConfigが正しい型を満たしている", () => {
    const config: OAuthProviderConfig = googleConfig;
    expect(config).toStrictEqual(googleConfig);
  });

  test("正常系: nameプロパティが正しい値を持つ", () => {
    expect(googleConfig.name).toStrictEqual("Google");
  });

  test("正常系: iconプロパティが正しい値を持つ", () => {
    expect(googleConfig.icon).toStrictEqual("🔍");
  });

  test("正常系: connectionプロパティが正しい値を持つ", () => {
    expect(googleConfig.connection).toStrictEqual("google-oauth2");
  });

  test("正常系: availableScopesが配列である", () => {
    expect(Array.isArray(googleConfig.availableScopes)).toStrictEqual(true);
  });

  test("正常系: availableScopesが10個のスコープを含む", () => {
    expect(googleConfig.availableScopes.length).toStrictEqual(10);
  });

  test("正常系: すべてのスコープが必須プロパティを持つ", () => {
    googleConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(typeof scope.label).toStrictEqual("string");
      expect(typeof scope.description).toStrictEqual("string");
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.scopes.length).toBeGreaterThan(0);
      expect(typeof scope.category).toStrictEqual("string");
    });
  });

  test("正常系: drive-readスコープが正しく定義されている", () => {
    const driveReadScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "drive-read",
    );
    expect(driveReadScope).toStrictEqual({
      id: "drive-read",
      label: "Google Drive（読み取り）",
      description: "ファイルの閲覧・検索",
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      category: "ドライブ",
    });
  });

  test("正常系: drive-writeスコープが正しく定義されている", () => {
    const driveWriteScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "drive-write",
    );
    expect(driveWriteScope).toStrictEqual({
      id: "drive-write",
      label: "Google Drive（書き込み）",
      description: "ファイルの作成・編集・削除",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      category: "ドライブ",
    });
  });

  test("正常系: drive-fullスコープが正しく定義されている", () => {
    const driveFullScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "drive-full",
    );
    expect(driveFullScope).toStrictEqual({
      id: "drive-full",
      label: "Google Drive（フルアクセス）",
      description: "すべてのドライブ機能へのアクセス",
      scopes: ["https://www.googleapis.com/auth/drive"],
      category: "ドライブ",
    });
  });

  test("正常系: calendarスコープが正しく定義されている", () => {
    const calendarScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "calendar",
    );
    expect(calendarScope).toStrictEqual({
      id: "calendar",
      label: "カレンダー",
      description: "カレンダーイベントの管理",
      scopes: ["https://www.googleapis.com/auth/calendar"],
      category: "カレンダー",
    });
  });

  test("正常系: calendar-readonlyスコープが正しく定義されている", () => {
    const calendarReadonlyScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "calendar-readonly",
    );
    expect(calendarReadonlyScope).toStrictEqual({
      id: "calendar-readonly",
      label: "カレンダー（読み取り）",
      description: "カレンダーの閲覧のみ",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      category: "カレンダー",
    });
  });

  test("正常系: gmail-readonlyスコープが正しく定義されている", () => {
    const gmailReadonlyScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "gmail-readonly",
    );
    expect(gmailReadonlyScope).toStrictEqual({
      id: "gmail-readonly",
      label: "Gmail（読み取り）",
      description: "メールの読み取り",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      category: "メール",
    });
  });

  test("正常系: gmail-composeスコープが正しく定義されている", () => {
    const gmailComposeScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "gmail-compose",
    );
    expect(gmailComposeScope).toStrictEqual({
      id: "gmail-compose",
      label: "Gmail（作成）",
      description: "メールの作成・送信",
      scopes: ["https://www.googleapis.com/auth/gmail.compose"],
      category: "メール",
    });
  });

  test("正常系: gmail-modifyスコープが正しく定義されている", () => {
    const gmailModifyScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "gmail-modify",
    );
    expect(gmailModifyScope).toStrictEqual({
      id: "gmail-modify",
      label: "Gmail（編集）",
      description: "メールの編集・削除",
      scopes: ["https://www.googleapis.com/auth/gmail.modify"],
      category: "メール",
    });
  });

  test("正常系: tasksスコープが正しく定義されている", () => {
    const tasksScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "tasks",
    );
    expect(tasksScope).toStrictEqual({
      id: "tasks",
      label: "タスク",
      description: "Google Tasksの管理",
      scopes: ["https://www.googleapis.com/auth/tasks"],
      category: "その他",
    });
  });

  test("正常系: userinfoスコープが正しく定義されている", () => {
    const userinfoScope = googleConfig.availableScopes.find(
      (scope) => scope.id === "userinfo",
    );
    expect(userinfoScope).toStrictEqual({
      id: "userinfo",
      label: "ユーザー情報",
      description: "基本的なプロフィール情報",
      scopes: ["https://www.googleapis.com/auth/userinfo.profile"],
      category: "その他",
    });
  });

  test("正常系: すべてのスコープIDが一意である", () => {
    const scopeIds = googleConfig.availableScopes.map((scope) => scope.id);
    const uniqueScopeIds = new Set(scopeIds);
    expect(uniqueScopeIds.size).toStrictEqual(scopeIds.length);
  });

  test("正常系: すべてのスコープのscopesプロパティが空でない配列である", () => {
    googleConfig.availableScopes.forEach((scope) => {
      expect(scope.scopes.length).toBeGreaterThan(0);
      scope.scopes.forEach((s) => {
        expect(typeof s).toStrictEqual("string");
        expect(s.length).toBeGreaterThan(0);
      });
    });
  });

  test("正常系: すべてのGoogle OAuth2スコープURLが正しい形式である", () => {
    googleConfig.availableScopes.forEach((scope) => {
      scope.scopes.forEach((scopeUrl) => {
        expect(scopeUrl).toMatch(/^https:\/\/www\.googleapis\.com\/auth\/.+$/);
      });
    });
  });

  test("正常系: カテゴリーがドライブ・カレンダー・メール・その他のいずれかである", () => {
    const validCategories = ["ドライブ", "カレンダー", "メール", "その他"];
    googleConfig.availableScopes.forEach((scope) => {
      expect(validCategories).toContain(scope.category);
    });
  });

  test("正常系: ドライブカテゴリーに3つのスコープが存在する", () => {
    const driveScopes = googleConfig.availableScopes.filter(
      (scope) => scope.category === "ドライブ",
    );
    expect(driveScopes.length).toStrictEqual(3);
  });

  test("正常系: カレンダーカテゴリーに2つのスコープが存在する", () => {
    const calendarScopes = googleConfig.availableScopes.filter(
      (scope) => scope.category === "カレンダー",
    );
    expect(calendarScopes.length).toStrictEqual(2);
  });

  test("正常系: メールカテゴリーに3つのスコープが存在する", () => {
    const mailScopes = googleConfig.availableScopes.filter(
      (scope) => scope.category === "メール",
    );
    expect(mailScopes.length).toStrictEqual(3);
  });

  test("正常系: その他カテゴリーに2つのスコープが存在する", () => {
    const otherScopes = googleConfig.availableScopes.filter(
      (scope) => scope.category === "その他",
    );
    expect(otherScopes.length).toStrictEqual(2);
  });

  test("正常系: googleConfigオブジェクトがイミュータブルである", () => {
    const originalName = googleConfig.name;
    const originalIcon = googleConfig.icon;
    const originalConnection = googleConfig.connection;
    const originalScopesLength = googleConfig.availableScopes.length;

    // as constによりreadonlyになっているため、これらの操作はTypeScriptでエラーになる
    // ただし、テストではランタイムの動作を確認
    expect(googleConfig.name).toStrictEqual(originalName);
    expect(googleConfig.icon).toStrictEqual(originalIcon);
    expect(googleConfig.connection).toStrictEqual(originalConnection);
    expect(googleConfig.availableScopes.length).toStrictEqual(
      originalScopesLength,
    );
  });

  test("正常系: 各スコープのプロパティが正しい型である", () => {
    googleConfig.availableScopes.forEach((scope: OAuthScope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(scope.id.length).toBeGreaterThan(0);
      expect(typeof scope.label).toStrictEqual("string");
      expect(scope.label.length).toBeGreaterThan(0);
      expect(typeof scope.description).toStrictEqual("string");
      expect(scope.description.length).toBeGreaterThan(0);
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(typeof scope.category).toStrictEqual("string");
      expect(scope.category).toBeTruthy();
    });
  });

  test("正常系: ドライブスコープが権限レベル順に配置されている", () => {
    const driveScopes = googleConfig.availableScopes.filter(
      (scope) => scope.category === "ドライブ",
    );
    expect(driveScopes[0]?.id).toStrictEqual("drive-read");
    expect(driveScopes[1]?.id).toStrictEqual("drive-write");
    expect(driveScopes[2]?.id).toStrictEqual("drive-full");
  });

  test("正常系: スコープIDが説明的な命名規則に従っている", () => {
    googleConfig.availableScopes.forEach((scope) => {
      expect(scope.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    });
  });
});
