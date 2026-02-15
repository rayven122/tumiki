import { describe, test, expect } from "vitest";
import {
  parseIconPath,
  buildIconPath,
  getIconColorClass,
  ICON_COLOR_PALETTE,
  DEFAULT_ICON_COLOR,
} from "./iconColor";

describe("parseIconPath", () => {
  test("lucide:形式でアイコン名のみの場合、デフォルトカラーを返す", () => {
    const result = parseIconPath("lucide:Server");
    expect(result).toStrictEqual({
      iconName: "Server",
      color: "primary",
    });
  });

  test("lucide:形式でカラー指定がある場合、指定されたカラーを返す", () => {
    const result = parseIconPath("lucide:Bot#emerald");
    expect(result).toStrictEqual({
      iconName: "Bot",
      color: "emerald",
    });
  });

  test("すべてのプリセットカラーを正しくパースする", () => {
    for (const palette of ICON_COLOR_PALETTE) {
      const result = parseIconPath(`lucide:TestIcon#${palette.name}`);
      expect(result?.color).toBe(palette.name);
    }
  });

  test("無効なカラー名の場合、デフォルトカラーを返す", () => {
    const result = parseIconPath("lucide:Server#invalidColor");
    expect(result).toStrictEqual({
      iconName: "Server",
      color: "primary",
    });
  });

  test("nullを渡した場合、nullを返す", () => {
    const result = parseIconPath(null);
    expect(result).toBeNull();
  });

  test("undefinedを渡した場合、nullを返す", () => {
    const result = parseIconPath(undefined);
    expect(result).toBeNull();
  });

  test("URL形式の場合、nullを返す", () => {
    const result = parseIconPath("https://example.com/icon.png");
    expect(result).toBeNull();
  });

  test("空文字の場合、nullを返す", () => {
    const result = parseIconPath("");
    expect(result).toBeNull();
  });

  test("カラー指定が空の場合（末尾に#のみ）、空文字を無効なカラーとして扱いデフォルトを返す", () => {
    const result = parseIconPath("lucide:Server#");
    expect(result).toStrictEqual({
      iconName: "Server",
      color: "primary",
    });
  });
});

describe("buildIconPath", () => {
  test("デフォルトカラーの場合、カラー指定を省略する", () => {
    const result = buildIconPath("Server", "primary");
    expect(result).toBe("lucide:Server");
  });

  test("デフォルト以外のカラーの場合、カラー指定を含める", () => {
    const result = buildIconPath("Bot", "emerald");
    expect(result).toBe("lucide:Bot#emerald");
  });

  test("すべてのプリセットカラーで正しい形式を生成する", () => {
    for (const palette of ICON_COLOR_PALETTE) {
      const result = buildIconPath("TestIcon", palette.name);
      if (palette.name === DEFAULT_ICON_COLOR) {
        expect(result).toBe("lucide:TestIcon");
      } else {
        expect(result).toBe(`lucide:TestIcon#${palette.name}`);
      }
    }
  });
});

describe("getIconColorClass", () => {
  test("primaryカラーのクラスを返す", () => {
    const result = getIconColorClass("primary");
    expect(result).toBe("text-primary");
  });

  test("emeraldカラーのクラスを返す", () => {
    const result = getIconColorClass("emerald");
    expect(result).toBe("text-emerald-600");
  });

  test("blueカラーのクラスを返す", () => {
    const result = getIconColorClass("blue");
    expect(result).toBe("text-blue-600");
  });

  test("amberカラーのクラスを返す", () => {
    const result = getIconColorClass("amber");
    expect(result).toBe("text-amber-600");
  });

  test("redカラーのクラスを返す", () => {
    const result = getIconColorClass("red");
    expect(result).toBe("text-red-600");
  });

  test("grayカラーのクラスを返す", () => {
    const result = getIconColorClass("gray");
    expect(result).toBe("text-gray-600");
  });

  test("すべてのパレットカラーが正しいクラスを返す", () => {
    for (const palette of ICON_COLOR_PALETTE) {
      const result = getIconColorClass(palette.name);
      expect(result).toBe(palette.textClassName);
    }
  });
});

describe("parseIconPath と buildIconPath のラウンドトリップ", () => {
  test("パースしてビルドすると元の形式に戻る（デフォルトカラー）", () => {
    const original = "lucide:Server";
    const parsed = parseIconPath(original);
    expect(parsed).not.toBeNull();
    if (parsed) {
      const rebuilt = buildIconPath(parsed.iconName, parsed.color);
      expect(rebuilt).toBe(original);
    }
  });

  test("パースしてビルドすると元の形式に戻る（カスタムカラー）", () => {
    const original = "lucide:Bot#emerald";
    const parsed = parseIconPath(original);
    expect(parsed).not.toBeNull();
    if (parsed) {
      const rebuilt = buildIconPath(parsed.iconName, parsed.color);
      expect(rebuilt).toBe(original);
    }
  });
});
