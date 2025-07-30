/**
 * 2つの数値を加算する
 * @param a 第1引数
 * @param b 第2引数
 * @returns 加算結果
 */
export const add = (a: number, b: number): number => {
  return a + b
}

/**
 * 2つの数値を減算する
 * @param a 第1引数
 * @param b 第2引数
 * @returns 減算結果
 */
export const subtract = (a: number, b: number): number => {
  return a - b
}

/**
 * 2つの数値を乗算する
 * @param a 第1引数
 * @param b 第2引数
 * @returns 乗算結果
 */
export const multiply = (a: number, b: number): number => {
  return a * b
}

/**
 * 2つの数値を除算する
 * @param a 被除数
 * @param b 除数
 * @returns 除算結果
 * @throws 除数が0の場合エラー
 */
export const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw new Error('ゼロ除算エラー')
  }
  return a / b
}

/**
 * 数値が偶数かどうかを判定する
 * @param n 判定対象の数値
 * @returns 偶数の場合true
 */
export const isEven = (n: number): boolean => {
  return n % 2 === 0
}

/**
 * 配列の要素を合計する
 * @param numbers 数値の配列
 * @returns 合計値
 */
export const sum = (numbers: number[]): number => {
  if (numbers.length === 0) {
    return 0
  }
  return numbers.reduce((acc, curr) => acc + curr, 0)
}

/**
 * 配列の平均値を計算する
 * @param numbers 数値の配列
 * @returns 平均値
 * @throws 空配列の場合エラー
 */
export const average = (numbers: number[]): number => {
  if (numbers.length === 0) {
    throw new Error('空配列の平均値は計算できません')
  }
  return sum(numbers) / numbers.length
}