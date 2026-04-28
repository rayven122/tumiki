import type { PIIPattern } from "openredaction";

// 日本特化の PII 検出パターン
//
// なぜ secrets-curated.ts (gitleaks 互換 TOML) ではなく TS で直接定義しているか:
//
// 1. validator 関数が必要なパターンがあるため
//    マイナンバー (JP_MY_NUMBER) や運転免許 (JP_DRIVER_LICENSE) は
//    「12 桁の数字」だけだと業務 ID 等と区別できないため、チェックディジット
//    検証で偽陽性を除去する必要がある。OpenRedaction の PIIPattern.validator は
//    JS 関数を要求するため、データ記述言語の TOML では表現できない。
//
// 2. 流用元の TOML 資産が存在しないため
//    secrets-curated.ts で TOML 形式を採用した最大の利点は「gitleaks 公式 /
//    trufflehog 等の業界資産をコピペで取り込める」点。一方、日本特化 PII
//    (マイナンバー / パスポート 等) は gitleaks の標準ルールに含まれていない
//    ため、TOML 形式で書く旨味が薄い。
//
// したがって validator 不要の単純な regex (JP_PHONE / JP_POSTAL_CODE 等) も
// 含めて、日本特化パターンはこのファイルにまとめて配置する。

// マイナンバーのチェックディジット検証
// 仕様: 11 桁の数字に対して係数 (6,5,4,3,2,7,6,5,4,3,2) を掛けて和を出し、11 で割った余りから検査値を計算
// https://www.soumu.go.jp/main_content/000291950.pdf
export const validateMyNumberChecksum = (digits: string): boolean => {
  if (digits.length !== 12) return false;
  const factors = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += Number(digits[i]) * factors[i]!;
  }
  const remainder = sum % 11;
  const expected = remainder <= 1 ? 0 : 11 - remainder;
  return expected === Number(digits[11]);
};

// 上記コメント参照: validator が必要なもの (JP_MY_NUMBER 等) と、流用元 TOML が
// 存在しない単純 regex (JP_PHONE 等) をまとめてここに配置している
export const japanPatterns: PIIPattern[] = [
  {
    type: "JP_PHONE",
    // 固定電話 / 携帯 / フリーダイヤル等を許容（末尾 3〜4 桁）
    regex: /0\d{1,4}-\d{1,4}-\d{3,4}/g,
    priority: 10,
    placeholder: "[JP_PHONE_{n}]",
    severity: "medium",
    description: "日本の電話番号（ハイフン区切り、固定/携帯/フリーダイヤル）",
  },
  {
    type: "JP_POSTAL_CODE",
    regex: /〒?\d{3}-\d{4}/g,
    priority: 10,
    placeholder: "[JP_POSTAL_CODE_{n}]",
    severity: "low",
    description: "日本の郵便番号（〒記号有無を許容）",
  },
  {
    type: "JP_MY_NUMBER",
    regex: /(?<![\d-])\d{4}\s?\d{4}\s?\d{4}(?![\d-])/g,
    priority: 30,
    placeholder: "[JP_MY_NUMBER_{n}]",
    severity: "critical",
    description: "マイナンバー（個人番号）12桁 + チェックディジット検証",
    // 単純な12桁 regex だと偽陽性が多いため、チェックディジットで確度を上げる
    validator: (match) => {
      const digits = match.replace(/\s/g, "");
      return validateMyNumberChecksum(digits);
    },
  },
  {
    type: "JP_DRIVER_LICENSE",
    regex: /(?<![\d-])\d{12}(?![\d-])/g,
    priority: 15,
    placeholder: "[JP_DRIVER_LICENSE_{n}]",
    severity: "high",
    description:
      "運転免許証番号（12桁）。マイナンバーと形式が同じため priority を低めに",
    // マイナンバーのチェックディジットを満たさない 12 桁を運転免許証として扱う
    validator: (match) => {
      const digits = match.replace(/\s/g, "");
      return digits.length === 12 && !validateMyNumberChecksum(digits);
    },
  },
  {
    type: "JP_PASSPORT",
    regex: /\b[A-Z]{2}\d{7}\b/g,
    priority: 15,
    placeholder: "[JP_PASSPORT_{n}]",
    severity: "high",
    description: "日本のパスポート番号（英字2桁 + 数字7桁）",
  },
  // 健康保険証番号は「数字8桁」のみだと日付・金額・業務IDなど MCP 引数で頻出する形式と
  // 衝突するため、デフォルトでは登録しない。必要な場合は context キーワード必須の正規表現で
  // 組織独自に追加すること（例: `保険者番号[:：]\s*\d{8}`）
];
