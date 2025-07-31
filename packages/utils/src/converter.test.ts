import { describe, expect, test } from "vitest";

import { convertToSortOrder } from "./converter";

describe("convertToSortOrder", () => {
  test("正常系: sortOrderで昇順にソートする", () => {
    const input = [
      { sortOrder: 3, name: "item3" },
      { sortOrder: 1, name: "item1" },
      { sortOrder: 2, name: "item2" },
    ];
    const expected = [
      { sortOrder: 1, name: "item1" },
      { sortOrder: 2, name: "item2" },
      { sortOrder: 3, name: "item3" },
    ];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 既にソート済みの配列を渡した場合", () => {
    const input = [
      { sortOrder: 1, id: "a" },
      { sortOrder: 2, id: "b" },
      { sortOrder: 3, id: "c" },
    ];
    const expected = [...input];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 逆順の配列を正しくソートする", () => {
    const input = [
      { sortOrder: 5 },
      { sortOrder: 4 },
      { sortOrder: 3 },
      { sortOrder: 2 },
      { sortOrder: 1 },
    ];
    const expected = [
      { sortOrder: 1 },
      { sortOrder: 2 },
      { sortOrder: 3 },
      { sortOrder: 4 },
      { sortOrder: 5 },
    ];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 同じsortOrderを持つ要素の場合", () => {
    const input = [
      { sortOrder: 2, name: "a" },
      { sortOrder: 1, name: "b" },
      { sortOrder: 2, name: "c" },
      { sortOrder: 1, name: "d" },
    ];

    const result = convertToSortOrder(input);

    // 同じsortOrderの要素の相対的な順序は保証されないが、
    // sortOrderでグループ化されていることを確認
    expect(result[0]?.sortOrder).toStrictEqual(1);
    expect(result[1]?.sortOrder).toStrictEqual(1);
    expect(result[2]?.sortOrder).toStrictEqual(2);
    expect(result[3]?.sortOrder).toStrictEqual(2);
  });

  test("正常系: 負の数を含むsortOrderの場合", () => {
    const input = [
      { sortOrder: 0 },
      { sortOrder: -2 },
      { sortOrder: 3 },
      { sortOrder: -1 },
    ];
    const expected = [
      { sortOrder: -2 },
      { sortOrder: -1 },
      { sortOrder: 0 },
      { sortOrder: 3 },
    ];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 小数を含むsortOrderの場合", () => {
    const input = [
      { sortOrder: 1.5 },
      { sortOrder: 1 },
      { sortOrder: 2.7 },
      { sortOrder: 2.3 },
    ];
    const expected = [
      { sortOrder: 1 },
      { sortOrder: 1.5 },
      { sortOrder: 2.3 },
      { sortOrder: 2.7 },
    ];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 空の配列を渡した場合", () => {
    const input: { sortOrder: number }[] = [];
    const expected: { sortOrder: number }[] = [];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 要素が1つの配列を渡した場合", () => {
    const input = [{ sortOrder: 42, data: "single" }];
    const expected = [{ sortOrder: 42, data: "single" }];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 大きな数値を含むsortOrderの場合", () => {
    const input = [
      { sortOrder: Number.MAX_SAFE_INTEGER },
      { sortOrder: 0 },
      { sortOrder: Number.MIN_SAFE_INTEGER },
    ];
    const expected = [
      { sortOrder: Number.MIN_SAFE_INTEGER },
      { sortOrder: 0 },
      { sortOrder: Number.MAX_SAFE_INTEGER },
    ];

    const result = convertToSortOrder(input);
    expect(result).toStrictEqual(expected);
  });

  test("正常系: 複雑なオブジェクトを含む配列の場合", () => {
    const input = [
      {
        sortOrder: 3,
        nested: { value: "test" },
        array: [1, 2, 3],
      },
      {
        sortOrder: 1,
        nested: { value: "foo" },
        array: [4, 5, 6],
      },
      {
        sortOrder: 2,
        nested: { value: "bar" },
        array: [7, 8, 9],
      },
    ];

    const result = convertToSortOrder(input);

    expect(result[0]?.sortOrder).toStrictEqual(1);
    expect(result[0]?.nested.value).toStrictEqual("foo");
    expect(result[1]?.sortOrder).toStrictEqual(2);
    expect(result[1]?.nested.value).toStrictEqual("bar");
    expect(result[2]?.sortOrder).toStrictEqual(3);
    expect(result[2]?.nested.value).toStrictEqual("test");
  });

  test("副作用: 元の配列が変更されることを確認", () => {
    const original = [{ sortOrder: 3 }, { sortOrder: 1 }, { sortOrder: 2 }];

    const result = convertToSortOrder(original);

    // sort()は破壊的メソッドなので、元の配列も変更される
    expect(original).toStrictEqual(result);
    expect(original[0]?.sortOrder).toStrictEqual(1);
    expect(original[1]?.sortOrder).toStrictEqual(2);
    expect(original[2]?.sortOrder).toStrictEqual(3);
  });
});
