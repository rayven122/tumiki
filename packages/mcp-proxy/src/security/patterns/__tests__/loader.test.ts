import { describe, expect, test } from "vitest";

import { parseGitleaksToml } from "../loader.js";

describe("parseGitleaksToml", () => {
  test("gitleaks 互換 TOML を PIIPattern[] に変換する", () => {
    const toml = `
      [[rules]]
      id = "test-rule"
      description = "test description"
      regex = '''abc[0-9]{3}'''
      severity = "high"
    `;

    const patterns = parseGitleaksToml(toml);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      type: "TEST_RULE",
      placeholder: "[TEST_RULE_{n}]",
      severity: "high",
      description: "test description",
      priority: 20,
    });
    expect(patterns[0]?.regex.source).toBe("abc[0-9]{3}");
    expect(patterns[0]?.regex.flags).toBe("g");
  });

  test("RE2 の (?P<name>...) 構文を JS の (?<name>...) に変換する", () => {
    const toml = `
      [[rules]]
      id = "named-cap"
      regex = '''(?P<key>secret_)[a-z]{8}'''
    `;

    const [pattern] = parseGitleaksToml(toml);

    expect(pattern?.regex.source).toContain("(?<key>");
    expect(pattern?.regex.source).not.toContain("(?P<");
  });

  test("severity 省略時のデフォルトは high", () => {
    const toml = `
      [[rules]]
      id = "no-severity"
      regex = '''xxx'''
    `;

    const [pattern] = parseGitleaksToml(toml);

    expect(pattern?.severity).toBe("high");
  });

  test("kebab-case の id を UPPER_SNAKE_CASE の type に変換する", () => {
    const toml = `
      [[rules]]
      id = "github-fine-grained-pat"
      regex = '''xxx'''
    `;

    const [pattern] = parseGitleaksToml(toml);

    expect(pattern?.type).toBe("GITHUB_FINE_GRAINED_PAT");
    expect(pattern?.placeholder).toBe("[GITHUB_FINE_GRAINED_PAT_{n}]");
  });

  test("複数ルールが定義可能", () => {
    const toml = `
      [[rules]]
      id = "rule-a"
      regex = '''aaa'''

      [[rules]]
      id = "rule-b"
      regex = '''bbb'''
    `;

    const patterns = parseGitleaksToml(toml);

    expect(patterns).toHaveLength(2);
    expect(patterns.map((p) => p.type)).toStrictEqual(["RULE_A", "RULE_B"]);
  });

  test("空文字列 / rules セクションがない TOML は空配列を返す", () => {
    expect(parseGitleaksToml("")).toStrictEqual([]);
    expect(parseGitleaksToml("[other]\nx = 1")).toStrictEqual([]);
  });
});
