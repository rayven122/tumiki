import { describe, test, expect } from "vitest";
import type { McpCatalog } from "@prisma/desktop-client";
import { toCatalogItem } from "../catalog.mapper";

const createLocalCatalog = (
  overrides: Partial<McpCatalog> = {},
): McpCatalog => ({
  id: 1,
  name: "GitHub",
  description: "GitHub MCP",
  iconPath: "/logos/services/github.svg",
  transportType: "STREAMABLE_HTTP",
  command: null,
  args: '["--port", "3000"]',
  url: "https://api.github.com/mcp",
  credentialKeys: '["GITHUB_TOKEN"]',
  authType: "OAUTH",
  isOfficial: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

describe("toCatalogItem", () => {
  test("ローカルカタログをCatalogItem型に変換する", () => {
    const local = createLocalCatalog();
    const result = toCatalogItem(local);

    expect(result).toStrictEqual({
      id: "1",
      name: "GitHub",
      description: "GitHub MCP",
      iconUrl: "/logos/services/github.svg",
      status: "available",
      permissions: { read: true, write: true, execute: true },
      transportType: "STREAMABLE_HTTP",
      authType: "OAUTH",
      requiredCredentialKeys: ["GITHUB_TOKEN"],
      tools: [],
      connectionTemplate: {
        transportType: "STREAMABLE_HTTP",
        command: null,
        args: ["--port", "3000"],
        url: "https://api.github.com/mcp",
        authType: "OAUTH",
        credentialKeys: ["GITHUB_TOKEN"],
      },
    });
  });

  test("statusは常にavailableになる", () => {
    const result = toCatalogItem(createLocalCatalog());

    expect(result.status).toBe("available");
  });

  test("permissionsは全てtrueになる", () => {
    const result = toCatalogItem(createLocalCatalog());

    expect(result.permissions).toStrictEqual({
      read: true,
      write: true,
      execute: true,
    });
  });

  test("toolsは空配列になる", () => {
    const result = toCatalogItem(createLocalCatalog());

    expect(result.tools).toStrictEqual([]);
  });

  test("argsが空JSON配列の場合も正しくパースする", () => {
    const result = toCatalogItem(createLocalCatalog({ args: "[]" }));

    expect(result.connectionTemplate.args).toStrictEqual([]);
  });

  test("credentialKeysが空JSON配列の場合も正しくパースする", () => {
    const result = toCatalogItem(createLocalCatalog({ credentialKeys: "[]" }));

    expect(result.connectionTemplate.credentialKeys).toStrictEqual([]);
    expect(result.requiredCredentialKeys).toStrictEqual([]);
  });

  test("commandがnullの場合もconnectionTemplateに反映する", () => {
    const result = toCatalogItem(createLocalCatalog({ command: null }));

    expect(result.connectionTemplate.command).toBeNull();
  });

  test("urlがnullの場合もconnectionTemplateに反映する", () => {
    const result = toCatalogItem(createLocalCatalog({ url: null }));

    expect(result.connectionTemplate.url).toBeNull();
  });
});
