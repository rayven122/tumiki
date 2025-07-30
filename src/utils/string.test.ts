import { describe, test, expect } from 'vitest'
import {
  toUpperCase,
  toLowerCase,
  trim,
  reverse,
  isPalindrome,
  split,
  getLength,
  truncate
} from './string'

describe('toUpperCase', () => {
  test('正常系: 小文字を大文字に変換', () => {
    expect(toUpperCase('hello')).toStrictEqual('HELLO')
  })

  test('正常系: 既に大文字の場合', () => {
    expect(toUpperCase('HELLO')).toStrictEqual('HELLO')
  })

  test('正常系: 混在する文字列', () => {
    expect(toUpperCase('Hello World')).toStrictEqual('HELLO WORLD')
  })

  test('正常系: 日本語を含む文字列', () => {
    expect(toUpperCase('hello こんにちは')).toStrictEqual('HELLO こんにちは')
  })

  test('境界値: 空文字列', () => {
    expect(toUpperCase('')).toStrictEqual('')
  })

  test('境界値: 数字と記号を含む文字列', () => {
    expect(toUpperCase('abc123!@#')).toStrictEqual('ABC123!@#')
  })
})

describe('toLowerCase', () => {
  test('正常系: 大文字を小文字に変換', () => {
    expect(toLowerCase('HELLO')).toStrictEqual('hello')
  })

  test('正常系: 既に小文字の場合', () => {
    expect(toLowerCase('hello')).toStrictEqual('hello')
  })

  test('正常系: 混在する文字列', () => {
    expect(toLowerCase('Hello World')).toStrictEqual('hello world')
  })

  test('境界値: 空文字列', () => {
    expect(toLowerCase('')).toStrictEqual('')
  })
})

describe('trim', () => {
  test('正常系: 前後の空白を削除', () => {
    expect(trim('  hello  ')).toStrictEqual('hello')
  })

  test('正常系: 前だけの空白を削除', () => {
    expect(trim('  hello')).toStrictEqual('hello')
  })

  test('正常系: 後ろだけの空白を削除', () => {
    expect(trim('hello  ')).toStrictEqual('hello')
  })

  test('正常系: 改行とタブを含む空白', () => {
    expect(trim('\t\nhello\n\t')).toStrictEqual('hello')
  })

  test('正常系: 中間の空白は維持', () => {
    expect(trim('  hello world  ')).toStrictEqual('hello world')
  })

  test('境界値: 空文字列', () => {
    expect(trim('')).toStrictEqual('')
  })

  test('境界値: 空白のみの文字列', () => {
    expect(trim('   ')).toStrictEqual('')
  })
})

describe('reverse', () => {
  test('正常系: 通常の文字列を反転', () => {
    expect(reverse('hello')).toStrictEqual('olleh')
  })

  test('正常系: 日本語を含む文字列', () => {
    expect(reverse('こんにちは')).toStrictEqual('はちにんこ')
  })

  test('正常系: 数字と記号を含む文字列', () => {
    expect(reverse('abc123!@#')).toStrictEqual('#@!321cba')
  })

  test('境界値: 空文字列', () => {
    expect(reverse('')).toStrictEqual('')
  })

  test('境界値: 1文字の文字列', () => {
    expect(reverse('a')).toStrictEqual('a')
  })
})

describe('isPalindrome', () => {
  test('正常系: 単純な回文', () => {
    expect(isPalindrome('level')).toStrictEqual(true)
  })

  test('正常系: 大文字小文字を無視した回文', () => {
    expect(isPalindrome('Level')).toStrictEqual(true)
  })

  test('正常系: スペースと記号を無視した回文', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama')).toStrictEqual(true)
  })

  test('正常系: 回文ではない文字列', () => {
    expect(isPalindrome('hello')).toStrictEqual(false)
  })

  test('境界値: 空文字列', () => {
    expect(isPalindrome('')).toStrictEqual(true)
  })

  test('境界値: 1文字の文字列', () => {
    expect(isPalindrome('a')).toStrictEqual(true)
  })

  test('境界値: 数字の回文', () => {
    expect(isPalindrome('12321')).toStrictEqual(true)
  })
})

describe('split', () => {
  test('正常系: カンマで分割', () => {
    expect(split('apple,banana,orange', ',')).toStrictEqual(['apple', 'banana', 'orange'])
  })

  test('正常系: スペースで分割', () => {
    expect(split('hello world test', ' ')).toStrictEqual(['hello', 'world', 'test'])
  })

  test('正常系: 複数文字の区切り文字', () => {
    expect(split('apple::banana::orange', '::')).toStrictEqual(['apple', 'banana', 'orange'])
  })

  test('正常系: 区切り文字が見つからない場合', () => {
    expect(split('hello', ',')).toStrictEqual(['hello'])
  })

  test('境界値: 空文字列を分割', () => {
    expect(split('', ',')).toStrictEqual([''])
  })

  test('境界値: 連続する区切り文字', () => {
    expect(split('a,,b', ',')).toStrictEqual(['a', '', 'b'])
  })

  test('異常系: 空文字の区切り文字でエラー', () => {
    expect(() => split('hello', '')).toThrow('区切り文字が空文字です')
  })
})

describe('getLength', () => {
  test('正常系: 通常の文字列の長さ', () => {
    expect(getLength('hello')).toStrictEqual(5)
  })

  test('正常系: 日本語を含む文字列', () => {
    expect(getLength('こんにちは')).toStrictEqual(5)
  })

  test('正常系: スペースを含む文字列', () => {
    expect(getLength('hello world')).toStrictEqual(11)
  })

  test('境界値: 空文字列', () => {
    expect(getLength('')).toStrictEqual(0)
  })

  test('境界値: 1文字の文字列', () => {
    expect(getLength('a')).toStrictEqual(1)
  })
})

describe('truncate', () => {
  test('正常系: 指定長より長い文字列を切り詰め', () => {
    expect(truncate('hello world', 8)).toStrictEqual('hello...')
  })

  test('正常系: 指定長より短い文字列はそのまま', () => {
    expect(truncate('hello', 10)).toStrictEqual('hello')
  })

  test('正常系: 指定長と同じ長さの文字列', () => {
    expect(truncate('hello', 5)).toStrictEqual('hello')
  })

  test('正常系: カスタム省略記号', () => {
    expect(truncate('hello world', 8, '…')).toStrictEqual('hello w…')
  })

  test('境界値: 空文字列', () => {
    expect(truncate('', 5)).toStrictEqual('')
  })

  test('境界値: 省略記号より短い最大長', () => {
    expect(truncate('hello', 2)).toStrictEqual('..')
  })

  test('境界値: 最大長が0', () => {
    expect(truncate('hello', 0)).toStrictEqual('')
  })

  test('異常系: 負の最大長でエラー', () => {
    expect(() => truncate('hello', -1)).toThrow('最大長は0以上である必要があります')
  })
})