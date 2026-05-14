import { describe, test, expect } from "vitest";
import { mergeCredentials } from "../mcp.credentials";
import { CREDENTIALS_MASK_VALUE as MASK_VALUE } from "../../../../shared/mcp.constants";

describe("mcp.credentials", () => {
  describe("mergeCredentials", () => {
    test("MASK 値は既存値を維持する", () => {
      expect(
        mergeCredentials({ a: "x" }, { a: MASK_VALUE }, MASK_VALUE),
      ).toStrictEqual({ a: "x" });
    });

    test("空文字は既存値を維持する", () => {
      expect(mergeCredentials({ a: "x" }, { a: "" }, MASK_VALUE)).toStrictEqual(
        { a: "x" },
      );
    });

    test("空白のみの入力も既存値を維持する", () => {
      expect(
        mergeCredentials({ a: "x" }, { a: "   " }, MASK_VALUE),
      ).toStrictEqual({ a: "x" });
    });

    test("新値で上書きする", () => {
      expect(
        mergeCredentials({ a: "x" }, { a: "y" }, MASK_VALUE),
      ).toStrictEqual({ a: "y" });
    });

    test("既存に無いキーは追加しない", () => {
      expect(
        mergeCredentials({ a: "x" }, { b: "y" }, MASK_VALUE),
      ).toStrictEqual({ a: "x" });
    });

    test("existing が空の場合は何も追加されない", () => {
      expect(mergeCredentials({}, { a: "y" }, MASK_VALUE)).toStrictEqual({});
    });

    test("部分更新: 一部は上書き、一部は維持", () => {
      expect(
        mergeCredentials(
          { a: "x", b: "y" },
          { a: "z", b: MASK_VALUE },
          MASK_VALUE,
        ),
      ).toStrictEqual({ a: "z", b: "y" });
    });

    test("input に既存キーが含まれない場合は existing をそのまま返す", () => {
      expect(mergeCredentials({ a: "x" }, {}, MASK_VALUE)).toStrictEqual({
        a: "x",
      });
    });
  });
});
