import { describe, expect, test, vi } from "vitest";

import * as clientExports from "./client";

// モックの設定
vi.mock("@auth0/nextjs-auth0", () => ({
  Auth0Provider: vi.fn().mockName("Auth0Provider"),
  getAccessToken: vi.fn().mockName("getAccessToken"),
  useUser: vi.fn().mockName("useUser"),
}));

vi.mock("./providers.js", () => ({
  OAUTH_PROVIDERS: [
    "google",
    "github",
    "slack",
    "notion",
    "linkedin",
    "figma",
    "discord",
  ],
  PROVIDER_CONNECTIONS: {
    google: "google-oauth2",
    github: "github",
    slack: "sign-in-with-slack",
    notion: "Notion",
    linkedin: "linkedin",
    figma: "figma",
    discord: "discord",
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

  test("正常系: OAUTH_PROVIDERSがエクスポートされている", () => {
    expect(clientExports.OAUTH_PROVIDERS).toBeDefined();
    expect(Array.isArray(clientExports.OAUTH_PROVIDERS)).toStrictEqual(true);
  });

  test("正常系: エクスポートされているプロパティの数が正しい", () => {
    const exportedKeys = Object.keys(clientExports);
    expect(exportedKeys.length).toStrictEqual(5);
    expect(exportedKeys).toContain("useUser");
    expect(exportedKeys).toContain("getAccessToken");
    expect(exportedKeys).toContain("Auth0Provider");
    expect(exportedKeys).toContain("OAUTH_PROVIDERS");
    expect(exportedKeys).toContain("PROVIDER_CONNECTIONS");
  });

  test("正常系: Auth0の関数が正しくエクスポートされている", () => {
    // Auth0の関数がモック関数として定義されていることを確認
    expect(vi.isMockFunction(clientExports.Auth0Provider)).toStrictEqual(true);
    expect(vi.isMockFunction(clientExports.getAccessToken)).toStrictEqual(true);
    expect(vi.isMockFunction(clientExports.useUser)).toStrictEqual(true);
  });

  test("正常系: OAUTH_PROVIDERSが全てのプロバイダーを含んでいる", () => {
    expect(clientExports.OAUTH_PROVIDERS).toStrictEqual([
      "google",
      "github",
      "slack",
      "notion",
      "linkedin",
      "figma",
      "discord",
    ]);
  });

  test("正常系: PROVIDER_CONNECTIONSが正しいマッピングを持つ", () => {
    const connections = clientExports.PROVIDER_CONNECTIONS;

    expect(connections.google).toStrictEqual("google-oauth2");
    expect(connections.github).toStrictEqual("github");
    expect(connections.slack).toStrictEqual("sign-in-with-slack");
    expect(connections.notion).toStrictEqual("Notion");
    expect(connections.linkedin).toStrictEqual("linkedin");
    expect(connections.figma).toStrictEqual("figma");
    expect(connections.discord).toStrictEqual("discord");
  });

  test("正常系: エクスポートされた全ての要素が定義されている", () => {
    const allExports = [
      clientExports.Auth0Provider,
      clientExports.getAccessToken,
      clientExports.useUser,
      clientExports.OAUTH_PROVIDERS,
      clientExports.PROVIDER_CONNECTIONS,
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

  test("正常系: OAUTH_PROVIDERSとPROVIDER_CONNECTIONSの型が正しい", () => {
    expect(Array.isArray(clientExports.OAUTH_PROVIDERS)).toStrictEqual(true);
    expect(typeof clientExports.PROVIDER_CONNECTIONS).toStrictEqual("object");
    expect(Array.isArray(clientExports.PROVIDER_CONNECTIONS)).toStrictEqual(
      false,
    );
  });
});
