import { describe, expect, test, vi } from "vitest";

import type { CallToolResult } from "../../types.js";
import { createMockLogger } from "../../__tests__/test-helpers.js";
import { createRedactionFilter } from "../redaction-filter.js";

const TOOL_NAME = "linear__create_issue";

// example.com / test.com 等は OpenRedaction のデフォルト偽陽性フィルタで除外されるため、
// テストでは本番に近い形のドメインを使う
const SAMPLE_EMAIL = "tanaka@acme.co.jp";

const buildFilter = (
  overrides: Partial<Parameters<typeof createRedactionFilter>[0]> = {},
) =>
  createRedactionFilter({
    policy: "mask",
    logger: createMockLogger(),
    ...overrides,
  });

describe("createRedactionFilter - beforeCall", () => {
  test("検出なしの args は元のまま通過する", async () => {
    const filter = buildFilter();
    const args = { title: "課題タイトル", description: "通常の説明文" };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.args).toStrictEqual(args);
    expect(result.blocked).toBeUndefined();
  });

  test("mask ポリシー: email を含む文字列が token に置換される", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = { description: `${SAMPLE_EMAIL} に通知` };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.args.description).not.toBe(args.description);
    expect(result.args.description).toMatch(/\[EMAIL_\d+\]/);
    expect(result.blocked).toBeUndefined();
  });

  test("mask ポリシー: ネスト object 内の文字列も走査される", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = {
      issue: {
        body: `${SAMPLE_EMAIL} に連絡`,
        nested: { deeper: "yamada@acme-tech.jp 確認" },
      },
    };

    const result = await filter.beforeCall(TOOL_NAME, args);

    const issue = result.args.issue as Record<string, unknown>;
    expect(issue.body).toMatch(/\[EMAIL_\d+\]/);
    const nested = issue.nested as Record<string, unknown>;
    expect(nested.deeper).toMatch(/\[EMAIL_\d+\]/);
  });

  test("mask ポリシー: 配列内の文字列も走査される", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = {
      recipients: ["alice@acme.co.jp", "bob@acme.co.jp"],
    };

    const result = await filter.beforeCall(TOOL_NAME, args);

    const recipients = result.args.recipients as string[];
    expect(recipients[0]).toMatch(/\[EMAIL_\d+\]/);
    expect(recipients[1]).toMatch(/\[EMAIL_\d+\]/);
  });

  test("mask ポリシー: 空文字列はそのまま通過", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = { empty: "" };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.args.empty).toBe("");
  });

  test("detect-only ポリシー: 検出されても args は変換されない", async () => {
    const logger = createMockLogger();
    const filter = buildFilter({ policy: "detect-only", logger });
    const args = { description: `${SAMPLE_EMAIL} に通知` };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.args).toStrictEqual(args);
    expect(result.blocked).toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith(
      "[PII Detection] tools/call",
      expect.objectContaining({ tool: TOOL_NAME, policy: "detect-only" }),
    );
  });

  test("block ポリシー: PII 検出時に blocked が返される", async () => {
    const filter = buildFilter({ policy: "block" });
    const args = { description: `${SAMPLE_EMAIL} に通知` };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.blocked).toBeDefined();
    expect(result.blocked?.reason).toContain("機密情報を検出");
  });

  test("block ポリシー: PII 検出なしなら通過する", async () => {
    const filter = buildFilter({ policy: "block" });
    const args = { description: "通常の説明文" };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.blocked).toBeUndefined();
    expect(result.args).toStrictEqual(args);
  });

  test("allowlistTools に登録したツールはフィルタ対象外", async () => {
    const filter = buildFilter({
      policy: "block",
      allowlistTools: [TOOL_NAME],
    });
    const args = { description: `${SAMPLE_EMAIL} に通知` };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.blocked).toBeUndefined();
    expect(result.args).toStrictEqual(args);
  });

  test("customPatterns で追加したパターンが検出される", async () => {
    const filter = buildFilter({
      policy: "mask",
      customPatterns: [
        {
          type: "EMPLOYEE_ID",
          regex: /EMP-\d{6}/g,
          priority: 30,
          placeholder: "[EMPLOYEE_ID_{n}]",
          severity: "medium",
        },
      ],
    });
    const args = { note: "EMP-123456 に共有" };

    const result = await filter.beforeCall(TOOL_NAME, args);

    // customPatterns の placeholder の {n} は実際の番号に置換される
    expect(result.args.note).toMatch(/\[EMPLOYEE_ID_\d+\]/);
  });

  test("検出時に Logger に type と件数が記録される（生 PII は出力されない）", async () => {
    const logger = createMockLogger();
    const filter = buildFilter({ policy: "mask", logger });
    const args = { description: `${SAMPLE_EMAIL} に通知` };

    await filter.beforeCall(TOOL_NAME, args);

    const calls = vi.mocked(logger.info).mock.calls;
    const piiLogCall = calls.find((c) => c[0] === "[PII Detection] tools/call");
    expect(piiLogCall).toBeDefined();
    const meta = piiLogCall?.[1] as { types: Record<string, number> };
    expect(meta.types).toBeDefined();
    expect(JSON.stringify(meta)).not.toContain(SAMPLE_EMAIL);
  });

  test("プリミティブ値（number / boolean / null）はそのまま通過", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = {
      count: 42,
      enabled: true,
      missing: null,
      tag: undefined,
    };

    const result = await filter.beforeCall(TOOL_NAME, args);

    expect(result.args).toStrictEqual(args);
  });
});

describe("createRedactionFilter - afterCall", () => {
  test("redactionMap が空ならば result は素通し", async () => {
    const filter = buildFilter({ policy: "detect-only" });
    const result: CallToolResult = {
      content: [{ type: "text", text: "通常の応答" }],
    };

    const before = await filter.beforeCall(TOOL_NAME, { msg: "通常" });
    const after = await filter.afterCall(before.context, result);

    expect(after).toStrictEqual(result);
  });

  test("text フィールドが復号される", async () => {
    const filter = buildFilter({ policy: "mask" });
    const args = { msg: `${SAMPLE_EMAIL} への返信` };

    const before = await filter.beforeCall(TOOL_NAME, args);
    const maskedEmailToken = [
      ...(before.args.msg as string).matchAll(/\[EMAIL_\d+\]/g),
    ][0]?.[0];
    expect(maskedEmailToken).toBeDefined();

    // 上流が「マスク済みトークンをそのまま返した」想定の応答
    const result: CallToolResult = {
      content: [{ type: "text", text: `送信完了: ${maskedEmailToken}` }],
    };

    const after = await filter.afterCall(before.context, result);

    const restored = after.content[0] as { type: string; text: string };
    expect(restored.text).toContain(SAMPLE_EMAIL);
    expect(restored.text).not.toMatch(/\[EMAIL_\d+\]/);
  });

  test("text 以外の content（image など）は変更されない", async () => {
    const filter = buildFilter({ policy: "mask" });
    const before = await filter.beforeCall(TOOL_NAME, {
      msg: SAMPLE_EMAIL,
    });

    const imageContent = {
      type: "image",
      data: "base64...",
      mimeType: "image/png",
    };
    const result: CallToolResult = { content: [imageContent] };

    const after = await filter.afterCall(before.context, result);

    expect(after.content[0]).toStrictEqual(imageContent);
  });
});
