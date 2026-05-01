// 冪等性キー生成
// 同じ source + externalId + 内容ハッシュの event は 2 回目以降 no-op となるべき

import { createHash } from "node:crypto";

import type { ExternalId, SourceId } from "../domain/branded.js";

// 安定したシリアライズ: object のキー順序を固定して JSON 化する
// undefined は "null" に正規化し、JSON.stringify(undefined) が undefined を返すことによる
// 連結時の挙動の曖昧さを排除する（配列要素 / object 値での衝突可能性回避）
const stableStringify = (value: unknown): string => {
  if (value === undefined) return "null";
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
