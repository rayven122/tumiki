import { describe, expect, test } from "vitest";

import { getRequestPromptFromHints } from "../requestHints.js";

describe("getRequestPromptFromHints", () => {
  test("位置情報を含むプロンプトを生成する", () => {
    const result = getRequestPromptFromHints({
      latitude: "35.6762",
      longitude: "139.6503",
      city: "Tokyo",
      country: "JP",
    });

    expect(result).toContain("35.6762");
    expect(result).toContain("139.6503");
    expect(result).toContain("Tokyo");
    expect(result).toContain("JP");
  });

  test("undefined の値も処理する", () => {
    const result = getRequestPromptFromHints({
      latitude: undefined,
      longitude: undefined,
      city: undefined,
      country: undefined,
    });

    expect(result).toContain("lat: undefined");
    expect(result).toContain("lon: undefined");
  });
});
