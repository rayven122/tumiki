import { describe, test, expect } from "vitest";
import { getPaginationPages } from "../getPaginationPages";

describe("getPaginationPages", () => {
  test("ページ数が7以下の場合は全ページを返す", () => {
    expect(getPaginationPages(1, 1)).toStrictEqual([1]);
    expect(getPaginationPages(1, 5)).toStrictEqual([1, 2, 3, 4, 5]);
    expect(getPaginationPages(3, 7)).toStrictEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("ページ数が0の場合は空配列を返す", () => {
    expect(getPaginationPages(1, 0)).toStrictEqual([]);
  });

  test("先頭ページの場合は先頭と末尾と周辺ページを返す", () => {
    const result = getPaginationPages(1, 10);
    expect(result).toStrictEqual([1, 2, 10]);
  });

  test("末尾ページの場合は先頭と末尾と周辺ページを返す", () => {
    const result = getPaginationPages(10, 10);
    expect(result).toStrictEqual([1, 9, 10]);
  });

  test("中間ページの場合は先頭と末尾と前後1ページを返す", () => {
    const result = getPaginationPages(5, 10);
    expect(result).toStrictEqual([1, 4, 5, 6, 10]);
  });

  test("先頭付近のページでは重複なく返す", () => {
    const result = getPaginationPages(2, 10);
    expect(result).toStrictEqual([1, 2, 3, 10]);
  });

  test("末尾付近のページでは重複なく返す", () => {
    const result = getPaginationPages(9, 10);
    expect(result).toStrictEqual([1, 8, 9, 10]);
  });
});
