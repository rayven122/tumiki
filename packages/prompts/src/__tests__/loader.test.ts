import { afterEach, describe, expect, test } from "vitest";

import {
  clearCache,
  listMarkdownFiles,
  parseFrontmatter,
  readMarkdownFile,
  resolveContentDir,
  validatePersonaMetadata,
} from "../loader.js";

describe("parseFrontmatter", () => {
  test("YAML frontmatter を正しくパースする", () => {
    const raw = `---
id: test
name: Test
description: A test persona
---
Hello world`;

    const result = parseFrontmatter(raw);
    expect(result.metadata).toStrictEqual({
      id: "test",
      name: "Test",
      description: "A test persona",
    });
    expect(result.content).toBe("Hello world");
  });

  test("frontmatter がない場合はコンテンツのみ返す", () => {
    const raw = "Just some content";
    const result = parseFrontmatter(raw);
    expect(result.metadata).toStrictEqual({});
    expect(result.content).toBe("Just some content");
  });

  test("複数行のコンテンツを正しくパースする", () => {
    const raw = `---
id: multi
name: Multi
description: Multi-line
---
Line 1
Line 2
Line 3`;

    const result = parseFrontmatter(raw);
    expect(result.metadata.id).toBe("multi");
    expect(result.content).toBe("Line 1\nLine 2\nLine 3");
  });

  test("空の frontmatter の場合はコンテンツ全体を返す", () => {
    // 空の frontmatter（---\n---）は正規表現にマッチしないため
    // コンテンツ全体が返される
    const raw = `---
---
Content only`;

    const result = parseFrontmatter(raw);
    expect(result.metadata).toStrictEqual({});
    expect(result.content).toBe("---\n---\nContent only");
  });
});

describe("validatePersonaMetadata", () => {
  test("有効なメタデータを検証する", () => {
    const metadata = {
      id: "test",
      name: "Test",
      description: "A test persona",
    };

    const result = validatePersonaMetadata(metadata);
    expect(result).toStrictEqual(metadata);
  });

  test("id が欠けている場合にエラーをスローする", () => {
    const metadata = { name: "Test", description: "A test persona" };
    expect(() => validatePersonaMetadata(metadata)).toThrow(
      "ペルソナメタデータの必須フィールドが不足",
    );
  });

  test("name が欠けている場合にエラーをスローする", () => {
    const metadata = { id: "test", description: "A test persona" };
    expect(() => validatePersonaMetadata(metadata)).toThrow(
      "ペルソナメタデータの必須フィールドが不足",
    );
  });

  test("description が欠けている場合にエラーをスローする", () => {
    const metadata = { id: "test", name: "Test" };
    expect(() => validatePersonaMetadata(metadata)).toThrow(
      "ペルソナメタデータの必須フィールドが不足",
    );
  });
});

describe("readMarkdownFile", () => {
  afterEach(() => {
    clearCache();
  });

  test("ファイルを読み込んでキャッシュする", () => {
    const dir = resolveContentDir("personas");
    const filePath = `${dir}/default.md`;

    // 初回読み込み
    const content1 = readMarkdownFile(filePath);
    expect(content1).toContain("friendly assistant");

    // キャッシュから読み込み（同一の結果を返す）
    const content2 = readMarkdownFile(filePath);
    expect(content2).toBe(content1);
  });

  test("存在しないファイルでエラーをスローする", () => {
    expect(() => readMarkdownFile("/nonexistent/path.md")).toThrow();
  });
});

describe("listMarkdownFiles", () => {
  test("personas ディレクトリの .md ファイル一覧を返す", () => {
    const dir = resolveContentDir("personas");
    const files = listMarkdownFiles(dir);
    expect(files).toContain("default.md");
    expect(files).toContain("coharu.md");
  });

  test("存在しないディレクトリの場合は空配列を返す", () => {
    const files = listMarkdownFiles("/nonexistent/dir");
    expect(files).toStrictEqual([]);
  });
});
