import { describe, expect, test } from "vitest";
import { MCP_CATALOG_ITEMS } from "../mcpCatalog";

describe("MCP_CATALOG_ITEMS", () => {
  test("name に末尾の STDIO / MCP トークンが含まれないこと", () => {
    // トランスポート種別をユーザーに見せない方針のため、モック追加時に
    // " STDIO" や " MCP" を末尾に付けないことをガードする
    const offenders = MCP_CATALOG_ITEMS.filter((item) =>
      /\s+(STDIO|MCP)$/i.test(item.name),
    ).map((item) => item.name);

    expect(offenders).toStrictEqual([]);
  });

  test("id が一意であること", () => {
    const ids = MCP_CATALOG_ITEMS.map((item) => item.id);
    const unique = [...new Set(ids)];

    expect(unique).toStrictEqual(ids);
  });
});
