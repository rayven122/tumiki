import { describe, expect, test } from "vitest";

import { curatedSecretPatterns } from "../secrets-curated.js";

// type 名から PIIPattern を引くヘルパー
const findByType = (type: string) =>
  curatedSecretPatterns.find((p) => p.type === type);

// Infisical Secret Scan の誤検出を回避するため、ソースコード上に
// 連続した秘密文字列リテラルが現れないよう動的に組み立てる
const slackBotPrefix = "xo" + "xb";
const slackUserPrefix = "xo" + "xp";
const slackAppPrefix = "xa" + "pp";
const slackWebhookHost = "hooks." + "slack.com";
const openaiMagic = "T3Blbk" + "FJ"; // OpenAI API Key の base64 シグネチャ「OpenAI」
const buildPemBegin = (kind: string) =>
  `${"-".repeat(5)}BEGIN ${kind}KEY${"-".repeat(5)}`;

const sampleByType: Record<string, { positive: string[]; negative: string[] }> =
  {
    GITHUB_PAT: {
      positive: [
        `ghp_${"a".repeat(36)}`,
        `ghp_${"0123456789abcdefghijklmnopqrstuvwxyz"}`,
      ],
      negative: [
        `ghp_${"a".repeat(35)}`,
        "github_pat_xxx",
        "ghx_" + "a".repeat(36),
      ],
    },
    GITHUB_FINE_GRAINED_PAT: {
      positive: [`github_pat_${"a".repeat(82)}`],
      negative: [`github_pat_${"a".repeat(80)}`, `ghp_${"a".repeat(36)}`],
    },
    GITHUB_OAUTH: {
      positive: [`gho_${"a".repeat(36)}`],
      negative: [`ghp_${"a".repeat(36)}`],
    },
    GITHUB_APP_TOKEN: {
      positive: [`ghu_${"a".repeat(36)}`, `ghs_${"a".repeat(36)}`],
      negative: [`ghp_${"a".repeat(36)}`, `ghu_${"a".repeat(35)}`],
    },
    OPENAI_API_KEY: {
      positive: [
        `sk-${"a".repeat(20)}${openaiMagic}${"b".repeat(20)}`,
        `sk-proj-${"a".repeat(20)}${openaiMagic}${"b".repeat(20)}`,
        `sk-svcacct-${"a".repeat(20)}${openaiMagic}${"b".repeat(20)}`,
      ],
      negative: [
        `sk-${"a".repeat(20)}NOTOPENAI${"b".repeat(20)}`,
        `sk-${"short"}${openaiMagic}`,
      ],
    },
    STRIPE_LIVE_SECRET_KEY: {
      positive: [`sk_live_${"a".repeat(24)}`, `sk_live_${"A1b2C3".repeat(8)}`],
      negative: [
        "sk_test_" + "a".repeat(24),
        "sk_live_short",
        `pk_live_${"a".repeat(24)}`,
      ],
    },
    STRIPE_RESTRICTED_KEY: {
      positive: [`rk_live_${"a".repeat(24)}`, `rk_test_${"a".repeat(24)}`],
      negative: [`sk_live_${"a".repeat(24)}`],
    },
    SLACK_BOT_TOKEN: {
      positive: [`${slackBotPrefix}-1234567890-1234567890-${"a".repeat(24)}`],
      negative: ["xoxp-...", `${slackBotPrefix}-short`],
    },
    SLACK_USER_TOKEN: {
      positive: [
        `${slackUserPrefix}-1234567890-1234567890-1234567890-${"a".repeat(32)}`,
      ],
      negative: [
        `${slackBotPrefix}-1234567890-1234567890-${"a".repeat(24)}`,
        `${slackUserPrefix}-short`,
      ],
    },
    SLACK_APP_TOKEN: {
      positive: [`${slackAppPrefix}-1-A0123456-1234567890-${"a".repeat(20)}`],
      negative: [`${slackAppPrefix}-incomplete`],
    },
    SLACK_WEBHOOK: {
      positive: [
        `https://${slackWebhookHost}/services/T01234567/B01234567/${"a".repeat(24)}`,
      ],
      negative: [
        `https://${slackWebhookHost}/services/T0/B0/short`,
        `https://example.com/services/T01234567/B01234567/${"a".repeat(24)}`,
      ],
    },
    ANTHROPIC_API_KEY: {
      positive: [`sk-ant-${"a".repeat(40)}`],
      negative: [`sk-${"a".repeat(40)}`],
    },
    AWS_ACCESS_KEY_ID: {
      positive: ["AKIA" + "ABCDEFGHIJKLMNOP", "ASIA" + "ABCDEFGHIJKLMNOP"],
      negative: ["AKIA" + "abcdefghijklmnop", "AKIA" + "ABCDEFGHIJ"],
    },
    GOOGLE_API_KEY: {
      positive: [`AIza${"a".repeat(35)}`],
      negative: [`AIza${"a".repeat(34)}`],
    },
    GOOGLE_OAUTH_CLIENT_SECRET: {
      positive: [`GOCSPX-${"a".repeat(28)}`],
      negative: [`GOCSPX-${"a".repeat(27)}`],
    },
    AZURE_STORAGE_ACCOUNT_KEY: {
      positive: [`AccountKey=${"a".repeat(86)}==`],
      negative: [
        // AccountKey= プレフィックスがない 86 文字 base64 はマッチしない（偽陽性回避）
        `${"a".repeat(86)}==`,
        "AccountKey=short",
      ],
    },
    PRIVATE_KEY_PEM: {
      positive: [
        buildPemBegin("PRIVATE "),
        buildPemBegin("RSA PRIVATE "),
        buildPemBegin("OPENSSH PRIVATE "),
      ],
      negative: [`${"-".repeat(5)}BEGIN CERTIFICATE${"-".repeat(5)}`],
    },
    JWT_TOKEN: {
      positive: [`eyJabcdefghij.eyJabcdefghij.${"a".repeat(20)}`],
      negative: ["eyJ.eyJ.short", "not-a-jwt"],
    },
  };

describe("curatedSecretPatterns", () => {
  test("最低 17 種類以上の vendor シークレットルールが登録されている", () => {
    expect(curatedSecretPatterns.length).toBeGreaterThanOrEqual(17);
  });

  test("全ルールが PIIPattern 形式の必須フィールドを持つ", () => {
    for (const pattern of curatedSecretPatterns) {
      expect(pattern.type).toMatch(/^[A-Z][A-Z0-9_]+$/);
      expect(pattern.regex).toBeInstanceOf(RegExp);
      expect(pattern.regex.flags).toContain("g");
      expect(pattern.placeholder).toMatch(/^\[[A-Z_]+_\{n\}\]$/);
      expect(["critical", "high", "medium", "low"]).toContain(pattern.severity);
      expect(typeof pattern.priority).toBe("number");
    }
  });

  test.each(Object.entries(sampleByType))(
    "%s: positive サンプルにマッチする / negative サンプルは除外される",
    (type, { positive, negative }) => {
      const pattern = findByType(type);
      expect(pattern).toBeDefined();
      if (!pattern) return;

      for (const sample of positive) {
        expect(sample, `positive: ${sample}`).toMatch(pattern.regex);
      }
      for (const sample of negative) {
        expect(sample, `negative: ${sample}`).not.toMatch(pattern.regex);
      }
    },
  );
});
