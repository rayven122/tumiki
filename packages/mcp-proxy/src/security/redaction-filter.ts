import type { OpenRedactionOptions, PIIPattern } from "openredaction";
import { OpenRedaction } from "openredaction";

import type { CallToolResult, Logger, ToolCallFilter } from "../types.js";

// 検出時の処理ポリシー
// - mask: 検出値をプレースホルダーに置換して送信、応答で復号
// - detect-only: 置換せず送信、ログにのみ記録
// - block: 検出があれば upstream を呼ばずエラー応答を返す
export type RedactionPolicy = "mask" | "detect-only" | "block";

export type RedactionFilterOptions = {
  policy: RedactionPolicy;
  // OpenRedaction の検出器設定（preset / 各カテゴリの ON/OFF など）
  redactor?: OpenRedactionOptions;
  // ファイル定義のカスタムパターン（patterns/*.ts から束ねた配列）
  customPatterns?: PIIPattern[];
  // フィルタ対象外とするツール名（例: 認証系で API キーを正当に渡すツール）
  allowlistTools?: readonly string[];
  logger: Logger;
};

// 内部コンテキスト: beforeCall で構築し afterCall で復号に使う
type FilterContext = {
  redactionMap: Record<string, string>;
  detectedTypes: Record<string, number>;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// content アイテムが text 型として扱えるかの判定
const hasTextField = (
  c: unknown,
): c is { type: unknown; text: string; [k: string]: unknown } =>
  typeof c === "object" &&
  c !== null &&
  "type" in c &&
  "text" in c &&
  typeof (c as { text: unknown }).text === "string";

export const createRedactionFilter = (
  opts: RedactionFilterOptions,
): ToolCallFilter => {
  const detector = new OpenRedaction({
    enableContextAnalysis: false,
    deterministic: true,
    redactionMode: "placeholder",
    ...opts.redactor,
    customPatterns: opts.customPatterns ?? opts.redactor?.customPatterns,
  });

  const allowlist = new Set(opts.allowlistTools ?? []);

  // ネスト JSON を再帰的に走査し、文字列値だけ detect で検査・redact 用 map を蓄積
  const traverseAndRedact = async (
    value: unknown,
    map: Record<string, string>,
    typeCounts: Record<string, number>,
  ): Promise<unknown> => {
    if (typeof value === "string") {
      if (value.length === 0) return value;
      const result = await detector.detect(value);
      if (result.detections.length === 0) return value;
      Object.assign(map, result.redactionMap);
      for (const d of result.detections) {
        typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1;
      }
      return result.redacted;
    }
    if (Array.isArray(value)) {
      return Promise.all(
        value.map((v) => traverseAndRedact(v, map, typeCounts)),
      );
    }
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = await traverseAndRedact(v, map, typeCounts);
      }
      return out;
    }
    return value;
  };

  return {
    beforeCall: async (toolName, args) => {
      if (allowlist.has(toolName)) {
        return {
          args,
          context: { redactionMap: {}, detectedTypes: {} },
        };
      }

      const map: Record<string, string> = {};
      const typeCounts: Record<string, number> = {};
      const redactedArgs = (await traverseAndRedact(
        args,
        map,
        typeCounts,
      )) as Record<string, unknown>;

      const detected = Object.keys(typeCounts).length > 0;

      // 検出ログは type と件数のみ記録（生 PII は決して残さない）
      if (detected) {
        opts.logger.info("[PII Detection] tools/call", {
          tool: toolName,
          policy: opts.policy,
          types: typeCounts,
        });
      }

      switch (opts.policy) {
        case "block":
          if (detected) {
            return {
              args,
              context: { redactionMap: {}, detectedTypes: typeCounts },
              blocked: {
                reason: `機密情報を検出しました（タイプ: ${Object.keys(typeCounts).join(", ")}）`,
              },
            };
          }
          return {
            args,
            context: { redactionMap: {}, detectedTypes: typeCounts },
          };
        case "detect-only":
          return {
            args,
            context: { redactionMap: {}, detectedTypes: typeCounts },
          };
        case "mask":
          return {
            args: redactedArgs,
            context: { redactionMap: map, detectedTypes: typeCounts },
          };
      }
    },

    afterCall: async (context, result) => {
      const ctx = context as FilterContext;
      // mask 時のみ復号が必要（detect-only / block 時は redactionMap が空）
      if (Object.keys(ctx.redactionMap).length === 0) return result;

      const restoredContent: CallToolResult["content"] = result.content.map(
        (c) => {
          if (hasTextField(c)) {
            return {
              ...c,
              text: detector.restore(c.text, ctx.redactionMap),
            };
          }
          return c;
        },
      );

      return { ...result, content: restoredContent };
    },
  };
};
