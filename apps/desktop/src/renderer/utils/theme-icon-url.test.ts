import { describe, test, expect } from "vitest";
import { getThemeIconUrl } from "./theme-icon-url";

describe("getThemeIconUrl", () => {
  describe("null / undefined / 空文字入力", () => {
    test("nullはそのまま返す", () => {
      expect(getThemeIconUrl(null, "light")).toStrictEqual(null);
    });

    test("undefinedはそのまま返す", () => {
      expect(getThemeIconUrl(undefined, "dark")).toStrictEqual(undefined);
    });

    test("空文字はそのまま返す", () => {
      expect(getThemeIconUrl("", "light")).toStrictEqual("");
    });
  });

  describe("ライトモード: -light バリアントへ切り替え", () => {
    test("notion.svg → notion-light.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/notion.svg", "light"),
      ).toStrictEqual("/logos/services/notion-light.svg");
    });

    test("attio.svg → attio-light.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/attio.svg", "light"),
      ).toStrictEqual("/logos/services/attio-light.svg");
    });
  });

  describe("ダークモード: -dark バリアントへ切り替え", () => {
    test("outline.svg → outline-dark.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/outline.svg", "dark"),
      ).toStrictEqual("/logos/services/outline-dark.svg");
    });

    test("sequential-thinking.svg → sequential-thinking-dark.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/sequential-thinking.svg", "dark"),
      ).toStrictEqual("/logos/services/sequential-thinking-dark.svg");
    });

    test("github_black.svg → github_black-dark.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/github_black.svg", "dark"),
      ).toStrictEqual("/logos/services/github_black-dark.svg");
    });

    test("moneyforward.svg → moneyforward-dark.svg", () => {
      expect(
        getThemeIconUrl("/logos/services/moneyforward.svg", "dark"),
      ).toStrictEqual("/logos/services/moneyforward-dark.svg");
    });
  });

  describe("バリアントが存在しないアイコンはそのまま返す", () => {
    test("ライトモードでDARK_VARIANT対象アイコンはそのまま", () => {
      expect(
        getThemeIconUrl("/logos/services/outline.svg", "light"),
      ).toStrictEqual("/logos/services/outline.svg");
    });

    test("ダークモードでLIGHT_VARIANT対象アイコンはそのまま", () => {
      expect(
        getThemeIconUrl("/logos/services/notion.svg", "dark"),
      ).toStrictEqual("/logos/services/notion.svg");
    });

    test("どちらのセットにも含まれないアイコンはそのまま", () => {
      expect(
        getThemeIconUrl("/logos/services/slack.svg", "light"),
      ).toStrictEqual("/logos/services/slack.svg");
    });
  });

  describe("エッジケース", () => {
    test("拡張子なしURLはそのまま返す", () => {
      expect(getThemeIconUrl("/logos/services/notion", "light")).toStrictEqual(
        "/logos/services/notion",
      );
    });

    test("大文字拡張子にも対応する", () => {
      expect(
        getThemeIconUrl("/logos/services/attio.SVG", "light"),
      ).toStrictEqual("/logos/services/attio-light.SVG");
    });

    test("クエリパラメータ付きURLのベース名を正しく抽出する", () => {
      expect(
        getThemeIconUrl("/logos/services/notion.svg?v=1", "light"),
      ).toStrictEqual("/logos/services/notion-light.svg?v=1");
    });

    test("ハッシュフラグメント付きURLのベース名を正しく抽出する", () => {
      expect(
        getThemeIconUrl("/logos/services/notion.svg#icon", "light"),
      ).toStrictEqual("/logos/services/notion-light.svg#icon");
    });

    test("既にバリアントサフィックス付きのURLは二重変換されない", () => {
      expect(
        getThemeIconUrl("/logos/services/notion-light.svg", "light"),
      ).toStrictEqual("/logos/services/notion-light.svg");
    });

    test("ドットを含むベース名は最後の拡張子のみ変換する", () => {
      expect(
        getThemeIconUrl("/logos/services/my.service.svg", "light"),
      ).toStrictEqual("/logos/services/my.service.svg");
    });
  });
});
