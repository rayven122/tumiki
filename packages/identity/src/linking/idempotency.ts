// 冪等性キー生成
// 同じ source + externalId + 内容ハッシュの event は 2 回目以降 no-op となるべき

import { createHash } from "node:crypto";

import type { ExternalId, SourceId } from "../domain/branded.js";

// 安定したシリアライズ: object のキー順序を固定して JSON 化する
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`,
  );
  return `{${entries.join(",")}}`;
};

export const computeIdempotencyKey = (
  source: SourceId,
  externalId: ExternalId,
  payload: unknown,
): string => {
  const material = `${source}|${externalId}|${stableStringify(payload)}`;
  return createHash("sha256").update(material).digest("hex");
};
