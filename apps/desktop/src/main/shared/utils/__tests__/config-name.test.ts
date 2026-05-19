import { describe, test, expect } from "vitest";
import { buildMcpConfigName } from "../config-name";

describe("buildMcpConfigName", () => {
  test("OFFICIAL かつ server.slug === conn.slug の単独接続は connSlug のみを返す", () => {
    expect(
      buildMcpConfigName({
        slug: "backlog",
        server: { slug: "backlog", serverType: "OFFICIAL" },
      }),
    ).toStrictEqual("backlog");
  });

  test("OFFICIAL でも server.slug !== conn.slug の場合は serverSlug-connSlug を返す", () => {
    expect(
      buildMcpConfigName({
        slug: "backlog-issue",
        server: { slug: "backlog", serverType: "OFFICIAL" },
      }),
    ).toStrictEqual("backlog-backlog-issue");
  });

  test("CUSTOM（仮想MCP）かつ server.slug !== conn.slug の場合は serverSlug-connSlug を返す", () => {
    expect(
      buildMcpConfigName({
        slug: "github",
        server: { slug: "weekly-report", serverType: "CUSTOM" },
      }),
    ).toStrictEqual("weekly-report-github");
  });

  test("CUSTOM かつ server.slug === conn.slug でも短縮しない（CUSTOM は常に prefix を残す）", () => {
    // 仮想MCP配下の接続が server と同名 slug を持つ稀なケース。
    // CUSTOM 判定で除外されるため `serverSlug-connSlug` が返ることをガードする。
    expect(
      buildMcpConfigName({
        slug: "github",
        server: { slug: "github", serverType: "CUSTOM" },
      }),
    ).toStrictEqual("github-github");
  });
});
