import { describe, test, expect } from "vitest";
import { parseToolName } from "../mcpToolName";

describe("parseToolName", () => {
  test("3パート形式（slug__normalizedName__toolName）を正しく解析する", () => {
    const result = parseToolName("linear-mcp__linear__list_teams");
    expect(result).toStrictEqual({
      serverSlug: "linear-mcp",
      displayToolName: "list_teams",
    });
  });

  test("2パート形式（slug__metaToolName）を正しく解析する", () => {
    const result = parseToolName("linear-mcp__search_tools");
    expect(result).toStrictEqual({
      serverSlug: "linear-mcp",
      displayToolName: "search_tools",
    });
  });

  test("4パート以上の形式でもツール名を正しく結合する", () => {
    const result = parseToolName("server__instance__tool__with__underscore");
    expect(result).toStrictEqual({
      serverSlug: "server",
      displayToolName: "tool__with__underscore",
    });
  });

  test("1パートのみの場合はそのまま返す", () => {
    const result = parseToolName("single_part");
    expect(result).toStrictEqual({
      serverSlug: "",
      displayToolName: "single_part",
    });
  });

  test("空文字の場合は空文字を返す", () => {
    const result = parseToolName("");
    expect(result).toStrictEqual({
      serverSlug: "",
      displayToolName: "",
    });
  });
});
