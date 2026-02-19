import { afterEach, describe, expect, test } from "vitest";

import {
  getArtifactsPrompt,
  getCodePrompt,
  getSheetPrompt,
  getUpdateDocumentPrompt,
} from "../instructions.js";
import { clearCache } from "../loader.js";

afterEach(() => {
  clearCache();
});

describe("getArtifactsPrompt", () => {
  test("Artifacts 指示プロンプトを返す", () => {
    const result = getArtifactsPrompt();
    expect(result).toContain("Artifacts");
    expect(result).toContain("createDocument");
    expect(result).toContain("updateDocument");
  });
});

describe("getCodePrompt", () => {
  test("コード生成指示プロンプトを返す", () => {
    const result = getCodePrompt();
    expect(result).toContain("Python");
    expect(result).toContain("code");
  });
});

describe("getSheetPrompt", () => {
  test("スプレッドシート生成指示プロンプトを返す", () => {
    const result = getSheetPrompt();
    expect(result).toContain("spreadsheet");
    expect(result).toContain("csv");
  });
});

describe("getUpdateDocumentPrompt", () => {
  test("テキストドキュメントの更新プロンプトを生成する", () => {
    const result = getUpdateDocumentPrompt("Hello", "text");
    expect(result).toContain("Improve the following contents");
    expect(result).toContain("Hello");
  });

  test("コードの更新プロンプトを生成する", () => {
    const result = getUpdateDocumentPrompt("print('hi')", "code");
    expect(result).toContain("Improve the following code snippet");
    expect(result).toContain("print('hi')");
  });

  test("スプレッドシートの更新プロンプトを生成する", () => {
    const result = getUpdateDocumentPrompt("a,b,c", "sheet");
    expect(result).toContain("Improve the following spreadsheet");
    expect(result).toContain("a,b,c");
  });

  test("画像タイプの場合は空文字を返す", () => {
    const result = getUpdateDocumentPrompt("data", "image");
    expect(result).toBe("");
  });
});
