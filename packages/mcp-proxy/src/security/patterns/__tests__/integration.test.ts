import { OpenRedaction } from "openredaction";
import { describe, expect, test } from "vitest";

import { japanPatterns, validateMyNumberChecksum } from "../japan.js";
import { parseGitleaksToml } from "../loader.js";
import { curatedSecretPatterns } from "../secrets-curated.js";

// 統合テスト: TOML → loader → OpenRedaction → 実際にマスクされる、までの e2e フロー
//
// 単体テスト (loader.test.ts / secrets-curated.test.ts / japan.test.ts) は
// 「TOML がパースできる」「regex がマッチする」までを検証していたが、
// 本当に OpenRedaction の customPatterns として機能してマスクされるかは未検証だった。
// このファイルでそこを補完する。

const buildDetector = (customPatterns: ReturnType<typeof parseGitleaksToml>) =>
  new OpenRedaction({
    enableContextAnalysis: false,
    deterministic: true,
    redactionMode: "placeholder",
    customPatterns,
  });

// Infisical Secret Scan 回避のため、サンプルは動的組み立て
const slackBotPrefix = "xo" + "xb";
const openaiMagic = "T3Blbk" + "FJ";

describe("TOML → loader → OpenRedaction e2e (任意ルール)", () => {
  test("パースしたパターンを customPatterns に渡すとマスキングできる", async () => {
    const toml = `
      [[rules]]
      id = "my-vendor-key"
      description = "Custom Vendor Key"
      regex = '''mvk_[0-9a-zA-Z]{32}'''
      severity = "critical"
    `;
    const patterns = parseGitleaksToml(toml);
    const detector = buildDetector(patterns);

    const secret = `mvk_${"a".repeat(32)}`;
    const input = `Use ${secret} for authentication`;
    const result = await detector.detect(input);

    expect(result.detections.some((d) => d.type === "MY_VENDOR_KEY")).toBe(
      true,
    );
    expect(result.redacted).not.toContain(secret);
    expect(result.redacted).toMatch(/\[MY_VENDOR_KEY_\d+\]/);
  });

  test("RE2 構文 (?P<name>...) を含むルールも変換されてマスキングできる", async () => {
    const toml = `
      [[rules]]
      id = "named-cap-rule"
      regex = '''(?P<prefix>secret_)[a-z]{8}'''
      severity = "high"
    `;
    const patterns = parseGitleaksToml(toml);
    const detector = buildDetector(patterns);

    const result = await detector.detect("token = secret_abcdefgh xxx");

    expect(result.detections.some((d) => d.type === "NAMED_CAP_RULE")).toBe(
      true,
    );
    expect(result.redacted).not.toContain("secret_abcdefgh");
  });

  test("無効な正規表現を含む TOML は parseGitleaksToml で例外をスロー", () => {
    const toml = `
      [[rules]]
      id = "broken-rule"
      regex = '''([unclosed'''
    `;

    expect(() => parseGitleaksToml(toml)).toThrow(
      /Invalid regex in TOML rule "broken-rule"/,
    );
  });
});

describe("curatedSecretPatterns 統合: 実 production パターンが OpenRedaction でマスキングできる", () => {
  const detector = buildDetector(curatedSecretPatterns);

  // 注: GitHub / Slack / AWS / OpenAI 等の主要 vendor は OpenRedaction 標準パターンが
  // 既に持っているため、custom 側の type (例: GITHUB_PAT) ではなく標準 type
  // (例: GITHUB_TOKEN) で検出される。テストでは「マスキングされること」と「何らかの
  // 関連 type で検出されること」を確認する。
  // custom パターン由来でしか検出できない vendor (ANTHROPIC_API_KEY 等) で
  // custom pattern が機能していることを別テストで確認する。

  test("GitHub PAT を含むテキストがマスキングされる（標準/custom どちらでも OK）", async () => {
    const secret = `ghp_${"a".repeat(36)}`;
    const result = await detector.detect(`Token: ${secret} は秘密です`);

    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.redacted).not.toContain(secret);
    expect(result.detections.some((d) => d.type.includes("GITHUB"))).toBe(
      true,
    );
  });

  test("Slack Bot Token を含むテキストがマスキングされる", async () => {
    const secret = `${slackBotPrefix}-1234567890-1234567890-${"a".repeat(24)}`;
    const result = await detector.detect(`Slack: ${secret}`);

    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.redacted).not.toContain(secret);
    expect(result.detections.some((d) => d.type.includes("SLACK"))).toBe(true);
  });

  test("ANTHROPIC_API_KEY (custom 由来パターン) でマスキングされる", async () => {
    // Anthropic key は OpenRedaction 標準には無いため、custom が機能している証拠になる
    const secret = `sk-ant-${"a".repeat(40)}`;
    const result = await detector.detect(`ANTHROPIC_API_KEY=${secret}`);

    expect(result.detections.some((d) => d.type === "ANTHROPIC_API_KEY")).toBe(
      true,
    );
    expect(result.redacted).not.toContain(secret);
    expect(result.redacted).toMatch(/\[ANTHROPIC_API_KEY_\d+\]/);
  });

  test("STRIPE_RESTRICTED_KEY (custom 由来パターン) でマスキングされる", async () => {
    // Stripe restricted key (rk_live_/rk_test_) は OpenRedaction 標準に無いため
    // custom が機能している証拠になる
    const secret = `rk_live_${"a".repeat(24)}`;
    const result = await detector.detect(`Stripe restricted: ${secret}`);

    expect(
      result.detections.some((d) => d.type === "STRIPE_RESTRICTED_KEY"),
    ).toBe(true);
    expect(result.redacted).not.toContain(secret);
  });

  test("OpenAI API Key を含むテキストがマスキングされる", async () => {
    const secret = `sk-proj-${"a".repeat(20)}${openaiMagic}${"b".repeat(20)}`;
    const result = await detector.detect(`OPENAI_API_KEY=${secret}`);

    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.redacted).not.toContain(secret);
  });

  test("AWS Access Key ID を含むテキストがマスキングされる", async () => {
    const secret = "AKIA" + "ABCDEFGHIJKLMNOP";
    const result = await detector.detect(`AWS_ACCESS_KEY_ID=${secret}`);

    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.redacted).not.toContain(secret);
    expect(result.detections.some((d) => /AWS|AKIA/i.test(d.type))).toBe(true);
  });

  test("複数 vendor のシークレットが混在しても全てマスキングされる", async () => {
    const githubToken = `ghp_${"a".repeat(36)}`;
    const slackToken = `${slackBotPrefix}-1234567890-1234567890-${"a".repeat(24)}`;
    const anthropicKey = `sk-ant-${"a".repeat(40)}`;
    const input = `GitHub: ${githubToken}\nSlack: ${slackToken}\nAnthropic: ${anthropicKey}`;
    const result = await detector.detect(input);

    expect(result.detections.length).toBeGreaterThanOrEqual(3);
    expect(result.redacted).not.toContain(githubToken);
    expect(result.redacted).not.toContain(slackToken);
    expect(result.redacted).not.toContain(anthropicKey);
  });

  test("通常の文章は custom 由来の vendor ルールで誤検出されない", async () => {
    const input =
      "プロジェクトの進捗状況を確認しました。来週までに完了予定です。";
    const result = await detector.detect(input);

    // custom パターンの type のみで誤検出が無いことを確認
    const customTypes = curatedSecretPatterns.map((p) => p.type);
    const detectedCustomTypes = result.detections
      .map((d) => d.type)
      .filter((t) => customTypes.includes(t));
    expect(detectedCustomTypes).toStrictEqual([]);
  });
});

describe("japanPatterns 統合: 日本特化パターンが OpenRedaction でマスキングできる", () => {
  const detector = buildDetector(japanPatterns);

  test("日本電話番号がマスキングされる", async () => {
    const result = await detector.detect("お問合せは 03-1234-5678 まで");

    expect(result.detections.some((d) => d.type === "JP_PHONE")).toBe(true);
    expect(result.redacted).not.toContain("03-1234-5678");
  });

  test("郵便番号がマスキングされる", async () => {
    const result = await detector.detect("〒150-0001 東京都渋谷区");

    expect(result.detections.some((d) => d.type === "JP_POSTAL_CODE")).toBe(
      true,
    );
  });

  test("正しいチェックディジット付きマイナンバーがマスキングされる（validator が機能している）", async () => {
    // 11 桁の prefix から validator でチェックディジット計算
    const factors = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const first11 = "12345678901";
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += Number(first11[i]) * factors[i]!;
    }
    const remainder = sum % 11;
    const checkDigit = remainder <= 1 ? 0 : 11 - remainder;
    const validNumber = first11 + String(checkDigit);

    expect(validateMyNumberChecksum(validNumber)).toBe(true);

    const result = await detector.detect(`マイナンバー: ${validNumber}`);

    expect(result.detections.some((d) => d.type === "JP_MY_NUMBER")).toBe(true);
    expect(result.redacted).not.toContain(validNumber);
  });

  test("不正なチェックディジットの 12 桁数字は JP_MY_NUMBER として検出されない（validator が偽陽性除去している）", async () => {
    // チェックディジットを意図的に間違えた 12 桁
    const invalidNumber = "123456789012"; // 末尾 2 は正しい check digit ではないはず
    expect(validateMyNumberChecksum(invalidNumber)).toBe(false);

    const result = await detector.detect(`番号: ${invalidNumber}`);

    // JP_MY_NUMBER としては検出されない（validator で除外）
    expect(result.detections.some((d) => d.type === "JP_MY_NUMBER")).toBe(
      false,
    );
  });
});
