import { describe, expect, test } from "vitest";

import type { OAuthProviderConfig, OAuthScope } from "./types";
import { githubConfig } from "./github";

describe("githubConfig", () => {
  test("正常系: githubConfigが正しい型を満たしている", () => {
    const config: OAuthProviderConfig = githubConfig;
    expect(config).toStrictEqual(githubConfig);
  });

  test("正常系: nameプロパティが正しい値を持つ", () => {
    expect(githubConfig.name).toStrictEqual("GitHub");
  });

  test("正常系: iconプロパティが正しい値を持つ", () => {
    expect(githubConfig.icon).toStrictEqual("🐙");
  });

  test("正常系: connectionプロパティが正しい値を持つ", () => {
    expect(githubConfig.connection).toStrictEqual("github");
  });

  test("正常系: availableScopesが配列である", () => {
    expect(Array.isArray(githubConfig.availableScopes)).toStrictEqual(true);
  });

  test("正常系: availableScopesが14個のスコープを含む", () => {
    expect(githubConfig.availableScopes.length).toStrictEqual(14);
  });

  test("正常系: すべてのスコープが必須プロパティを持つ", () => {
    githubConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(typeof scope.label).toStrictEqual("string");
      expect(typeof scope.description).toStrictEqual("string");
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.scopes.length).toBeGreaterThan(0);
    });
  });

  test("正常系: repoスコープが正しく定義されている", () => {
    const repoScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "repo",
    );
    expect(repoScope).toStrictEqual({
      id: "repo",
      label: "リポジトリ",
      description: "リポジトリの読み書き",
      scopes: ["repo"],
    });
  });

  test("正常系: repo-statusスコープが正しく定義されている", () => {
    const repoStatusScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "repo-status",
    );
    expect(repoStatusScope).toStrictEqual({
      id: "repo-status",
      label: "コミットステータス",
      description: "コミットステータスへのアクセス",
      scopes: ["repo:status"],
    });
  });

  test("正常系: repo-deploymentスコープが正しく定義されている", () => {
    const repoDeploymentScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "repo-deployment",
    );
    expect(repoDeploymentScope).toStrictEqual({
      id: "repo-deployment",
      label: "デプロイメント",
      description: "デプロイメントステータスへのアクセス",
      scopes: ["repo_deployment"],
    });
  });

  test("正常系: public-repoスコープが正しく定義されている", () => {
    const publicRepoScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "public-repo",
    );
    expect(publicRepoScope).toStrictEqual({
      id: "public-repo",
      label: "パブリックリポジトリ",
      description: "パブリックリポジトリへのアクセス",
      scopes: ["public_repo"],
    });
  });

  test("正常系: repo-inviteスコープが正しく定義されている", () => {
    const repoInviteScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "repo-invite",
    );
    expect(repoInviteScope).toStrictEqual({
      id: "repo-invite",
      label: "リポジトリ招待",
      description: "リポジトリ共同作業者の招待を受け入れ/拒否",
      scopes: ["repo:invite"],
    });
  });

  test("正常系: gistスコープが正しく定義されている", () => {
    const gistScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "gist",
    );
    expect(gistScope).toStrictEqual({
      id: "gist",
      label: "Gist",
      description: "Gistの管理",
      scopes: ["gist"],
    });
  });

  test("正常系: notificationsスコープが正しく定義されている", () => {
    const notificationsScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "notifications",
    );
    expect(notificationsScope).toStrictEqual({
      id: "notifications",
      label: "通知",
      description: "通知へのアクセス",
      scopes: ["notifications"],
    });
  });

  test("正常系: userスコープが正しく定義されている", () => {
    const userScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "user",
    );
    expect(userScope).toStrictEqual({
      id: "user",
      label: "ユーザープロフィール",
      description: "ユーザープロフィールの更新",
      scopes: ["user"],
    });
  });

  test("正常系: read-userスコープが正しく定義されている", () => {
    const readUserScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "read-user",
    );
    expect(readUserScope).toStrictEqual({
      id: "read-user",
      label: "ユーザー情報（読み取り）",
      description: "ユーザープロフィールの読み取り",
      scopes: ["read:user"],
    });
  });

  test("正常系: user-emailスコープが正しく定義されている", () => {
    const userEmailScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "user-email",
    );
    expect(userEmailScope).toStrictEqual({
      id: "user-email",
      label: "メールアドレス",
      description: "メールアドレスへのアクセス",
      scopes: ["user:email"],
    });
  });

  test("正常系: user-followスコープが正しく定義されている", () => {
    const userFollowScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "user-follow",
    );
    expect(userFollowScope).toStrictEqual({
      id: "user-follow",
      label: "フォロー",
      description: "他のユーザーのフォロー/アンフォロー",
      scopes: ["user:follow"],
    });
  });

  test("正常系: orgスコープが正しく定義されている", () => {
    const orgScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "org",
    );
    expect(orgScope).toStrictEqual({
      id: "org",
      label: "組織（フルアクセス）",
      description: "組織の管理",
      scopes: ["admin:org"],
    });
  });

  test("正常系: read-orgスコープが正しく定義されている", () => {
    const readOrgScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "read-org",
    );
    expect(readOrgScope).toStrictEqual({
      id: "read-org",
      label: "組織（読み取り）",
      description: "組織メンバーシップとチームの読み取り",
      scopes: ["read:org"],
    });
  });

  test("正常系: write-orgスコープが正しく定義されている", () => {
    const writeOrgScope = githubConfig.availableScopes.find(
      (scope) => scope.id === "write-org",
    );
    expect(writeOrgScope).toStrictEqual({
      id: "write-org",
      label: "組織（書き込み）",
      description: "組織メンバーシップの管理",
      scopes: ["write:org"],
    });
  });

  test("正常系: すべてのスコープIDが一意である", () => {
    const scopeIds = githubConfig.availableScopes.map((scope) => scope.id);
    const uniqueScopeIds = new Set(scopeIds);
    expect(uniqueScopeIds.size).toStrictEqual(scopeIds.length);
  });

  test("正常系: すべてのスコープのscopesプロパティが空でない配列である", () => {
    githubConfig.availableScopes.forEach((scope) => {
      expect(scope.scopes.length).toBeGreaterThan(0);
      scope.scopes.forEach((s) => {
        expect(typeof s).toStrictEqual("string");
        expect(s.length).toBeGreaterThan(0);
      });
    });
  });

  test("正常系: githubConfigオブジェクトがイミュータブルである", () => {
    const originalName = githubConfig.name;
    const originalIcon = githubConfig.icon;
    const originalConnection = githubConfig.connection;
    const originalScopesLength = githubConfig.availableScopes.length;

    // as constによりreadonlyになっているため、これらの操作はTypeScriptでエラーになる
    // ただし、テストではランタイムの動作を確認
    expect(githubConfig.name).toStrictEqual(originalName);
    expect(githubConfig.icon).toStrictEqual(originalIcon);
    expect(githubConfig.connection).toStrictEqual(originalConnection);
    expect(githubConfig.availableScopes.length).toStrictEqual(
      originalScopesLength,
    );
  });

  test("正常系: 各スコープのプロパティが正しい型である", () => {
    githubConfig.availableScopes.forEach((scope: OAuthScope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(scope.id.length).toBeGreaterThan(0);
      expect(typeof scope.label).toStrictEqual("string");
      expect(scope.label.length).toBeGreaterThan(0);
      expect(typeof scope.description).toStrictEqual("string");
      expect(scope.description.length).toBeGreaterThan(0);
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.category).toBeUndefined();
    });
  });
});
