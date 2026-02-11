import type { Tiktoken } from "js-tiktoken";
import { getEncoding } from "js-tiktoken";

/**
 * トークン数計算ユーティリティ
 *
 * js-tiktoken を使用してテキストのトークン数を計算する。
 * エンコーディングは cl100k_base（GPT-4/GPT-3.5-turbo 互換）を使用。
 */

// シングルトンエンコーダー（パフォーマンス最適化）
let encoder: Tiktoken | null = null;

/**
 * エンコーダーを取得（遅延初期化）
 */
const getEncoder = (): Tiktoken => {
  // cl100k_base: GPT-4, GPT-3.5-turbo, text-embedding-ada-002 で使用
  encoder ??= getEncoding("cl100k_base");
  return encoder;
};

/**
 * テキストのトークン数を計算
 *
 * @param text - 計算対象のテキスト
 * @returns トークン数
 */
export const countTokens = (text: string): number => {
  if (!text) {
    return 0;
  }
  return getEncoder().encode(text).length;
};
