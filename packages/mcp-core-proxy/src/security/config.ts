import type { OpenRedactionOptions } from "openredaction";

import type { RedactionPolicy } from "./redaction-filter.js";

// PII マスキング機能の動作設定
// 設定を変更したい場合はこのファイルを編集してリビルドする
// （DB / UI / 環境変数による切替は当面サポートしない）

// PII マスキング機能を有効化するか
export const DEFAULT_PII_MASKING_ENABLED = true;

// 検出時の処理ポリシー
export const DEFAULT_REDACTION_POLICY: RedactionPolicy = "mask";

// OpenRedaction の検出器設定
// - enableContextAnalysis: false — 日本語環境でも確実に検出するため文脈解析を無効化
// - redactionMode: "placeholder" — [EMAIL_XXXX] 形式の可逆トークンで置換（fake data 置換ではない）
// - deterministic: true — 同じ値は同じトークンに固定して相関を防ぐ
export const DEFAULT_REDACTOR_OPTIONS: OpenRedactionOptions = {
  enableContextAnalysis: false,
  deterministic: true,
  redactionMode: "placeholder",
};

// フィルタ対象外とするツール名
// 例: 認証ツールに API キーを正当に渡すケース
export const DEFAULT_ALLOWLIST_TOOLS: readonly string[] = [];
