import { describe, expect, test, vi } from "vitest";

import { applyToonConversion } from "../toon/toonConverter.js";

describe("applyToonConversion", () => {
  test("text content の JSON 文字列を TOON 形式へ変換する", () => {
    const original = JSON.stringify({
      users: [
        { id: 1, name: "alice" },
        { id: 2, name: "bob" },
      ],
    });

    const result = applyToonConversion({
      content: [{ type: "text", text: original }],
    });

    const converted = result.content[0] as { type: "text"; text: string };
    expect(converted.type).toBe("text");
    // 圧縮効率の良い構造データなので変換後 < 元データ になるはず
    expect(converted.text.length).toBeLessThan(original.length);
    // TOON は配列をテーブル形式で表現するため "users" キーが残る
    expect(converted.text).toContain("users");
  });

  test("圧縮効率が悪化する場合は元のテキストを維持する", () => {
    // 短い文字列は TOON 化すると quote 等が付き膨張する
    const original = "hi";

    const result = applyToonConversion({
      content: [{ type: "text", text: original }],
    });

    const converted = result.content[0] as { type: "text"; text: string };
    expect(converted.text).toBe(original);
  });

  test("非 text タイプの content（image 等）はそのまま透過する", () => {
    const imageItem = {
      type: "image" as const,
      data: "BASE64DATA",
      mimeType: "image/png",
    };

    const result = applyToonConversion({
      content: [imageItem],
    });

    expect(result.content[0]).toStrictEqual(imageItem);
  });

  test("複数 content 中の text のみ変換し、他はそのまま透過する", () => {
    const longJson = JSON.stringify({
      records: Array.from({ length: 10 }, (_, i) => ({ id: i, value: i * 2 })),
    });
    const imageItem = {
      type: "image" as const,
      data: "AAAA",
      mimeType: "image/png",
    };

    const result = applyToonConversion({
      content: [{ type: "text", text: longJson }, imageItem],
    });

    const text = result.content[0] as { type: "text"; text: string };
    expect(text.text.length).toBeLessThan(longJson.length);
    expect(result.content[1]).toStrictEqual(imageItem);
  });

  test("isError フィールドは保持される", () => {
    const original = JSON.stringify({ error: "boom" });

    const result = applyToonConversion({
      content: [{ type: "text", text: original }],
      isError: true,
    });

    expect(result.isError).toBe(true);
  });

  test("encode が例外をスローした場合は元の result をそのまま返す（fail-open）", async () => {
    // encode を一時的に例外スローへ差し替え、変換例外時のフェイルオープン挙動を検証する
    vi.resetModules();
    vi.doMock("@toon-format/toon", () => ({
      encode: vi.fn(() => {
        throw new Error("encode failed");
      }),
    }));

    try {
      const { applyToonConversion: applyWithFailingEncode } =
        await import("../toon/toonConverter.js");

      const original = {
        content: [{ type: "text" as const, text: '{"key":"value"}' }],
        isError: false,
      };

      const result = applyWithFailingEncode(original);

      // 例外が外側 try-catch で捕捉され、元の result がそのまま返される
      expect(result).toStrictEqual(original);
    } finally {
      vi.doUnmock("@toon-format/toon");
      vi.resetModules();
    }
  });
});
