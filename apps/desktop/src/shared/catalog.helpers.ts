/**
 * Catalog 関連の共通ヘルパー
 * main / renderer 両方で使用する
 */
import type { CatalogItem } from "../types/catalog";

/** 認証種別ラベル（UI表示用） */
export const authTypeLabel: Record<CatalogItem["authType"], string> = {
  NONE: "設定不要",
  BEARER: "Bearer",
  API_KEY: "API Key",
  OAUTH: "OAuth",
};

/**
 * カタログの credentialKeys（JSON文字列または配列）をパースして string[] を返す
 * DBから来る値で要素が string でない可能性に備え、型ガードで実行時に絞り込む
 */
export const parseCredentialKeys = (raw: string | string[]): string[] => {
  if (Array.isArray(raw)) {
    return raw.filter((k): k is string => typeof k === "string");
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
};
