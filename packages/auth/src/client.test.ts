import { describe, expect, test, vi } from "vitest";

import * as clientExports from "./client";

// モックの設定
vi.mock("@auth0/nextjs-auth0", () => ({
  Auth0Provider: vi.fn().mockName("Auth0Provider"),
  getAccessToken: vi.fn().mockName("getAccessToken"),
  useUser: vi.fn().mockName("useUser"),
}));

vi.mock("./providers/index.js", () => ({
  OAUTH_PROVIDER_CONFIG: {
    google: {
      name: "Google",
      icon: "🔍",
      connection: "google-oauth2",
      availableScopes: [],
    },
    github: {
      name: "GitHub",
      icon: "🐙",
      connection: "github",
      availableScopes: [],
    },
    slack: {
      name: "Slack",
      icon: "💬",
      connection: "slack",
      availableScopes: [],
    },
    notion: {
      name: "Notion",
      icon: "📝",
      connection: "notion",
      availableScopes: [],
    },
    linkedin: {
      name: "LinkedIn",
      icon: "💼",
      connection: "linkedin",
      availableScopes: [],
    },
  },
}));

describe("client", () => {
  test("正常系: Auth0Providerがエクスポートされている", () => {
    expect(clientExports.Auth0Provider).toBeDefined();
    expect(typeof clientExports.Auth0Provider).toStrictEqual("function");
  });

  test("正常系: getAccessTokenがエクスポートされている", () => {
    expect(clientExports.getAccessToken).toBeDefined();
    expect(typeof clientExports.getAccessToken).toStrictEqual("function");
  });

  test("正常系: useUserがエクスポートされている", () => {
    expect(clientExports.useUser).toBeDefined();
    expect(typeof clientExports.useUser).toStrictEqual("function");
  });

  test("正常系: OAUTH_PROVIDER_CONFIGがエクスポートされている", () => {
    expect(clientExports.OAUTH_PROVIDER_CONFIG).toBeDefined();
    expect(typeof clientExports.OAUTH_PROVIDER_CONFIG).toStrictEqual("object");
  });

  test("正常系: エクスポートされているプロパティの数が正しい", () => {
    const exportedKeys = Object.keys(clientExports);
    expect(exportedKeys.length).toStrictEqual(4);
    expect(exportedKeys).toContain("useUser");
    expect(exportedKeys).toContain("getAccessToken");
    expect(exportedKeys).toContain("Auth0Provider");
    expect(exportedKeys).toContain("OAUTH_PROVIDER_CONFIG");
  });

  test("正常系: Auth0の関数が正しくエクスポートされている", () => {
    // Auth0の関数がモック関数として定義されていることを確認
    expect(vi.isMockFunction(clientExports.Auth0Provider)).toStrictEqual(true);
    expect(vi.isMockFunction(clientExports.getAccessToken)).toStrictEqual(true);
    expect(vi.isMockFunction(clientExports.useUser)).toStrictEqual(true);
  });

  test("正常系: OAUTH_PROVIDER_CONFIGが全てのプロバイダーを含んでいる", () => {
    const providers = Object.keys(clientExports.OAUTH_PROVIDER_CONFIG);
    expect(providers).toStrictEqual([
      "google",
      "github",
      "slack",
      "notion",
      "linkedin",
    ]);
  });

  test("正常系: OAUTH_PROVIDER_CONFIGの各プロバイダーが正しい構造を持つ", () => {
    const config = clientExports.OAUTH_PROVIDER_CONFIG;

    // Google
    expect(config.google).toStrictEqual({
      name: "Google",
      icon: "🔍",
      connection: "google-oauth2",
      availableScopes: [],
    });

    // GitHub
    expect(config.github).toStrictEqual({
      name: "GitHub",
      icon: "🐙",
      connection: "github",
      availableScopes: [],
    });

    // Slack
    expect(config.slack).toStrictEqual({
      name: "Slack",
      icon: "💬",
      connection: "slack",
      availableScopes: [],
    });

    // Notion
    expect(config.notion).toStrictEqual({
      name: "Notion",
      icon: "📝",
      connection: "notion",
      availableScopes: [],
    });

    // LinkedIn
    expect(config.linkedin).toStrictEqual({
      name: "LinkedIn",
      icon: "💼",
      connection: "linkedin",
      availableScopes: [],
    });
  });

  test("正常系: エクスポートされた全ての要素が定義されている", () => {
    const allExports = [
      clientExports.Auth0Provider,
      clientExports.getAccessToken,
      clientExports.useUser,
      clientExports.OAUTH_PROVIDER_CONFIG,
    ];

    allExports.forEach((exportedItem) => {
      expect(exportedItem).toBeDefined();
      expect(exportedItem).not.toBeNull();
      expect(exportedItem).not.toBeUndefined();
    });
  });

  test("正常系: Auth0関数の型が正しい", () => {
    expect(typeof clientExports.Auth0Provider).toStrictEqual("function");
    expect(typeof clientExports.getAccessToken).toStrictEqual("function");
    expect(typeof clientExports.useUser).toStrictEqual("function");
  });

  test("正常系: OAUTH_PROVIDER_CONFIGの型が正しい", () => {
    expect(typeof clientExports.OAUTH_PROVIDER_CONFIG).toStrictEqual("object");
    expect(Array.isArray(clientExports.OAUTH_PROVIDER_CONFIG)).toStrictEqual(
      false,
    );
  });
});
