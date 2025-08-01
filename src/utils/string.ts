/**
 * 文字列を大文字に変換する
 * @param str 変換対象の文字列
 * @returns 大文字に変換された文字列
 */
export const toUpperCase = (str: string): string => {
  return str.toUpperCase()
}

/**
 * 文字列を小文字に変換する
 * @param str 変換対象の文字列
 * @returns 小文字に変換された文字列
 */
export const toLowerCase = (str: string): string => {
  return str.toLowerCase()
}

/**
 * 文字列の前後の空白を削除する
 * @param str トリム対象の文字列
 * @returns トリムされた文字列
 */
export const trim = (str: string): string => {
  return str.trim()
}

/**
 * 文字列を反転する
 * @param str 反転対象の文字列
 * @returns 反転された文字列
 */
export const reverse = (str: string): string => {
  return str.split('').reverse().join('')
}

/**
 * 文字列が回文かどうかを判定する
 * @param str 判定対象の文字列
 * @returns 回文の場合true
 */
export const isPalindrome = (str: string): boolean => {
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalized === reverse(normalized)
}

/**
 * 文字列を指定した区切り文字で分割する
 * @param str 分割対象の文字列
 * @param delimiter 区切り文字
 * @returns 分割された文字列の配列
 */
export const split = (str: string, delimiter: string): string[] => {
  if (delimiter === '') {
    throw new Error('区切り文字が空文字です')
  }
  return str.split(delimiter)
}

/**
 * 文字列の長さを取得する
 * @param str 対象の文字列
 * @returns 文字列の長さ
 */
export const getLength = (str: string): number => {
  return str.length
}

/**
 * 文字列を指定した長さで切り詰める
 * @param str 対象の文字列
 * @param maxLength 最大長
 * @param ellipsis 省略記号
 * @returns 切り詰められた文字列
 */
export const truncate = (str: string, maxLength: number, ellipsis: string = '...'): string => {
  if (maxLength < 0) {
    throw new Error('最大長は0以上である必要があります')
  }
  if (str.length <= maxLength) {
    return str
  }
  if (maxLength <= ellipsis.length) {
    return ellipsis.slice(0, maxLength)
  }
  return str.slice(0, maxLength - ellipsis.length) + ellipsis
}