import { describe, expect, test } from "vitest";
import {
  normalizeSearchWhitespace,
  simplifyToolSearchText,
} from "../search-text";

describe("ツール検索テキスト処理", () => {
  test("連続する空白文字を正規化する", () => {
    expect(normalizeSearchWhitespace("  foo\n\tbar   baz  ")).toBe(
      "foo bar baz",
    );
  });

  test("customName/customDescriptionが存在する場合はそちらを使用する", () => {
    expect(
      simplifyToolSearchText({
        name: "original_name",
        description: "original description",
        customName: "  Search   Issues ",
        customDescription: " Find\nproject\tissues ",
      }),
    ).toBe("Search Issues\nFind project issues");
  });

  test("説明が空の場合は省略する", () => {
    expect(
      simplifyToolSearchText({
        name: "search",
        description: "",
        customName: null,
        customDescription: null,
      }),
    ).toBe("search");
  });
});
