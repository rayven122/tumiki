/**
 * UTF-8バイト長計算ユーティリティ
 *
 * TextEncoderインスタンスをシングルトンとして保持し、
 * 文字列のUTF-8バイト長を効率的に計算する。
 */

const textEncoder = new TextEncoder();

/**
 * 文字列のUTF-8バイト長を計算する
 */
export const byteLength = (text: string): number =>
  textEncoder.encode(text).length;
