import type { OpenRedactionOptions, PIIPattern } from "openredaction";
import { OpenRedaction } from "openredaction";

import type {
  CallToolResult,
  Logger,
  PiiDetectionSummary,
  ToolCallFilter,
} from "../types.js";

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

// 内部コンテキスト: beforeCall で構築し afterCall で復号 / 監査ログに使う
type FilterContext = {
  redactionMap: Record<string, string>;
  // type 別に件数とマスク後トークンを集計（監査ログ向け、生 PII は含まない）
  summary: PiiDetectionSummary;
};

const emptyContext = (): FilterContext => ({
  redactionMap: {},
  summary: {},
});

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// FilterContext かどうかの実行時検証（unknown を安全に narrow するため）
const isFilterContext = (v: unknown): v is FilterContext =>
  isPlainObject(v) &&
  "redactionMap" in v &&
  isPlainObject(v.redactionMap) &&
  "summary" in v &&
  isPlainObject(v.summary);

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

  // ネスト JSON を再帰的に走査し、文字列値だけ detect で検査・redact 用 map と検出サマリを蓄積
  const traverseAndRedact = async (
    value: unknown,
    map: Record<string, string>,
    summary: PiiDetectionSummary,
  ): Promise<unknown> => {
    if (typeof value === "string") {
      if (value.length === 0) return value;
      const result = await detector.detect(value);
      if (result.detections.length === 0) return value;
      Object.assign(map, result.redactionMap);
      for (const d of result.detections) {
        const entry = (summary[d.type] ??= { count: 0, tokens: [] });
        entry.count += 1;
        // 重複トークンは追加しない（同じ値が複数箇所に出てきたケース）
        if (!entry.tokens.includes(d.placeholder)) {
          entry.tokens.push(d.placeholder);
        }
      }
      return result.redacted;
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => traverseAndRedact(v, map, summary)));
    }
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = await traverseAndRedact(v, map, summary);
      }
      return out;
    }
    return value;
  };

  return {
    policy: opts.policy,

    beforeCall: async (toolName, args) => {
      if (allowlist.has(toolName)) {
        return { args, context: emptyContext() };
      }

      const map: Record<string, string> = {};
      const summary: PiiDetectionSummary = {};
      const redactedArgs = (await traverseAndRedact(
        args,
        map,
        summary,
      )) as Record<string, unknown>;

      const detectedTypes = Object.keys(summary);
      const detected = detectedTypes.length > 0;

      // 検出ログは type / 件数 / マスク後トークンのみ記録（生 PII は決して残さない）
      if (detected) {
        opts.logger.info("[PII Detection] tools/call", {
          tool: toolName,
          policy: opts.policy,
          summary,
        });
      }

      switch (opts.policy) {
        case "block":
          if (detected) {
            return {
              args,
              context: { redactionMap: {}, summary },
              blocked: {
                reason: `機密情報を検出しました（タイプ: ${detectedTypes.join(", ")}）`,
              },
            };
          }
          return {
            args,
            context: { redactionMap: {}, summary },
          };
        case "detect-only":
          return {
            args,
            context: { redactionMap: {}, summary },
          };
        case "mask":
          return {
            args: redactedArgs,
            context: { redactionMap: map, summary },
          };
      }
    },

    afterCall: async (context, result) => {
      // 想定外の context が渡されたら何もしない（fail-safe）
      if (!isFilterContext(context)) return result;
      // mask 時のみ復号が必要（detect-only / block 時は redactionMap が空）
      if (Object.keys(context.redactionMap).length === 0) return result;

      const restoredContent: CallToolResult["content"] = result.content.map(
        (c) => {
          if (hasTextField(c)) {
            return {
              ...c,
              text: detector.restore(c.text, context.redactionMap),
            };
          }
          return c;
        },
      );

      return { ...result, content: restoredContent };
    },

    getDetectionSummary: (context) => {
      if (!isFilterContext(context)) return undefined;
      if (Object.keys(context.summary).length === 0) return undefined;
      return context.summary;
    },
  };
};
