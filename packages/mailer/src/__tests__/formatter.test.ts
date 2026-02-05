import { describe, expect, test } from "vitest";

import { formatFromAddress } from "../utils/formatter.js";

describe("formatFromAddress", () => {
  describe("表示名なしの場合", () => {
    test("メールアドレスのみを返す", () => {
      const result = formatFromAddress("info@tumiki.cloud");

      expect(result).toStrictEqual("info@tumiki.cloud");
    });

    test("undefinedの表示名の場合はメールアドレスのみを返す", () => {
      const result = formatFromAddress("info@tumiki.cloud", undefined);

      expect(result).toStrictEqual("info@tumiki.cloud");
    });

    test("空文字の表示名の場合はメールアドレスのみを返す", () => {
      const result = formatFromAddress("info@tumiki.cloud", "");

      expect(result).toStrictEqual("info@tumiki.cloud");
    });

    test("空白のみの表示名の場合はメールアドレスのみを返す", () => {
      const result = formatFromAddress("info@tumiki.cloud", "   ");

      expect(result).toStrictEqual("info@tumiki.cloud");
    });
  });

  describe("シンプルな表示名の場合", () => {
    test("RFC 5322形式で返す", () => {
      const result = formatFromAddress("info@tumiki.cloud", "TumikiTeam");

      expect(result).toStrictEqual("TumikiTeam <info@tumiki.cloud>");
    });

    test("前後の空白をトリムする", () => {
      const result = formatFromAddress("info@tumiki.cloud", "  TumikiTeam  ");

      expect(result).toStrictEqual("TumikiTeam <info@tumiki.cloud>");
    });
  });

  describe("特殊文字を含む表示名の場合", () => {
    test("スペースを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki Team");

      expect(result).toStrictEqual('"Tumiki Team" <info@tumiki.cloud>');
    });

    test("カンマを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki, Inc.");

      expect(result).toStrictEqual('"Tumiki, Inc." <info@tumiki.cloud>');
    });

    test("ピリオドを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki.Team");

      expect(result).toStrictEqual('"Tumiki.Team" <info@tumiki.cloud>');
    });

    test("コロンを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki:Team");

      expect(result).toStrictEqual('"Tumiki:Team" <info@tumiki.cloud>');
    });

    test("セミコロンを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki;Team");

      expect(result).toStrictEqual('"Tumiki;Team" <info@tumiki.cloud>');
    });

    test("角括弧を含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki[Team]");

      expect(result).toStrictEqual('"Tumiki[Team]" <info@tumiki.cloud>');
    });

    test("丸括弧を含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki(Team)");

      expect(result).toStrictEqual('"Tumiki(Team)" <info@tumiki.cloud>');
    });

    test("山括弧を含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki<Team>");

      expect(result).toStrictEqual('"Tumiki<Team>" <info@tumiki.cloud>');
    });

    test("アットマークを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki@Team");

      expect(result).toStrictEqual('"Tumiki@Team" <info@tumiki.cloud>');
    });

    test("バックスラッシュを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "Tumiki\\Team");

      expect(result).toStrictEqual('"Tumiki\\Team" <info@tumiki.cloud>');
    });

    test("ダブルクォートを含む場合はエスケープしてダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", 'Tumiki"Team');

      expect(result).toStrictEqual('"Tumiki\\"Team" <info@tumiki.cloud>');
    });

    test("複数のダブルクォートを含む場合は全てエスケープする", () => {
      const result = formatFromAddress("info@tumiki.cloud", '"Tumiki"Team"');

      expect(result).toStrictEqual('"\\"Tumiki\\"Team\\"" <info@tumiki.cloud>');
    });
  });

  describe("日本語の表示名の場合", () => {
    test("日本語のみの場合はそのまま返す", () => {
      const result = formatFromAddress("info@tumiki.cloud", "積木チーム");

      expect(result).toStrictEqual("積木チーム <info@tumiki.cloud>");
    });

    test("日本語とスペースを含む場合はダブルクォートで囲む", () => {
      const result = formatFromAddress("info@tumiki.cloud", "積木 チーム");

      expect(result).toStrictEqual('"積木 チーム" <info@tumiki.cloud>');
    });
  });
});
