import { describe, expect, test } from "vitest";
import { CATALOG_SEEDS } from "../seed-data";

describe("CATALOG_SEEDS", () => {
  test("name に末尾の STDIO / MCP トークンが含まれないこと", () => {
    // トランスポート種別をユーザーに見せない方針のため、シード追加時に
    // " STDIO" や " MCP" を末尾に付けないことをガードする
    const offenders = CATALOG_SEEDS.filter((seed) =>
      /\s+(STDIO|MCP)$/i.test(seed.name),
    ).map((seed) => seed.name);

    expect(offenders).toStrictEqual([]);
  });

  test("name が一意であること", () => {
    const names = CATALOG_SEEDS.map((seed) => seed.name);
    const unique = [...new Set(names)];

    expect(unique).toStrictEqual(names);
  });
});
