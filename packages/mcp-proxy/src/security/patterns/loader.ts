import type { PIIPattern } from "openredaction";
import { parse as parseToml } from "@iarna/toml";

// gitleaks 互換の TOML フォーマット
// https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml
type GitleaksRule = {
  id: string;
  description?: string;
  regex: string;
  // 互換のため severity は TOML 側に明示記載（OpenRedaction 用）
  severity?: "critical" | "high" | "medium" | "low";
  // gitleaks の他フィールド（keywords / entropy / secretGroup / allowlist 等）は
  // 現状の実装ではサポートしない（必要になった時点で追加実装）
};

type GitleaksToml = {
  rules?: GitleaksRule[];
};

// 全ルール共通の優先度。OpenRedaction の標準パターンより上げて vendor 系を先に評価する
const DEFAULT_PRIORITY = 20;

// Go の RE2 構文を JavaScript の RegExp 互換に変換する
// gitleaks のルールは Go RE2 で書かれているため、いくつかの構文を機械置換する必要がある
// - 名前付きキャプチャ: (?P<name>...) → (?<name>...)
// 後方参照は RE2 が対応しないため gitleaks ルールでは使われない（互換性問題は少ない）
const convertRe2ToJs = (re2: string): string => re2.replace(/\(\?P</g, "(?<");

// gitleaks の id (kebab-case) を OpenRedaction の type (UPPER_SNAKE_CASE) に変換
// 例: "github-pat" → "GITHUB_PAT"
const ruleIdToType = (id: string): string =>
  id.toUpperCase().replace(/-/g, "_");

// type から OpenRedaction の placeholder テンプレートを生成
// 例: "GITHUB_PAT" → "[GITHUB_PAT_{n}]"
const typeToPlaceholder = (type: string): string => `[${type}_{n}]`;

// gitleaks 互換 TOML テキストを OpenRedaction の PIIPattern[] に変換
export const parseGitleaksToml = (tomlText: string): PIIPattern[] => {
  const toml = parseToml(tomlText) as GitleaksToml;
  const rules = toml.rules ?? [];

  return rules.map((rule) => {
    const type = ruleIdToType(rule.id);
    const jsRegexSource = convertRe2ToJs(rule.regex);
    return {
      type,
      regex: new RegExp(jsRegexSource, "g"),
      priority: DEFAULT_PRIORITY,
      placeholder: typeToPlaceholder(type),
      severity: rule.severity ?? "high",
      description: rule.description,
    };
  });
};
