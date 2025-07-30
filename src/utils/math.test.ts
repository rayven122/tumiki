import { describe, test, expect } from 'vitest'
import { add, subtract, multiply, divide, isEven, sum, average } from './math'

describe('add', () => {
  test('正常系: 正の数同士の加算', () => {
    expect(add(2, 3)).toStrictEqual(5)
  })

  test('正常系: 負の数を含む加算', () => {
    expect(add(-5, 3)).toStrictEqual(-2)
  })

  test('正常系: 負の数同士の加算', () => {
    expect(add(-2, -3)).toStrictEqual(-5)
  })

  test('境界値: ゼロを含む加算', () => {
    expect(add(0, 5)).toStrictEqual(5)
    expect(add(5, 0)).toStrictEqual(5)
    expect(add(0, 0)).toStrictEqual(0)
  })

  test('境界値: 小数を含む加算', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3, 10)
  })
})

describe('subtract', () => {
  test('正常系: 正の数同士の減算', () => {
    expect(subtract(5, 3)).toStrictEqual(2)
  })

  test('正常系: 負の数を含む減算', () => {
    expect(subtract(3, -2)).toStrictEqual(5)
    expect(subtract(-3, 2)).toStrictEqual(-5)
  })

  test('正常系: 同じ数の減算', () => {
    expect(subtract(5, 5)).toStrictEqual(0)
  })

  test('境界値: ゼロを含む減算', () => {
    expect(subtract(0, 5)).toStrictEqual(-5)
    expect(subtract(5, 0)).toStrictEqual(5)
  })
})

describe('multiply', () => {
  test('正常系: 正の数同士の乗算', () => {
    expect(multiply(3, 4)).toStrictEqual(12)
  })

  test('正常系: 負の数を含む乗算', () => {
    expect(multiply(-3, 4)).toStrictEqual(-12)
    expect(multiply(3, -4)).toStrictEqual(-12)
    expect(multiply(-3, -4)).toStrictEqual(12)
  })

  test('境界値: ゼロを含む乗算', () => {
    expect(multiply(0, 5)).toStrictEqual(0)
    expect(multiply(5, 0)).toStrictEqual(0)
  })

  test('境界値: 1を含む乗算', () => {
    expect(multiply(1, 5)).toStrictEqual(5)
    expect(multiply(5, 1)).toStrictEqual(5)
  })
})

describe('divide', () => {
  test('正常系: 正の数同士の除算', () => {
    expect(divide(10, 2)).toStrictEqual(5)
  })

  test('正常系: 負の数を含む除算', () => {
    expect(divide(-10, 2)).toStrictEqual(-5)
    expect(divide(10, -2)).toStrictEqual(-5)
    expect(divide(-10, -2)).toStrictEqual(5)
  })

  test('正常系: 割り切れない除算', () => {
    expect(divide(10, 3)).toBeCloseTo(3.333333, 5)
  })

  test('境界値: 1での除算', () => {
    expect(divide(5, 1)).toStrictEqual(5)
  })

  test('異常系: ゼロ除算でエラーが発生する', () => {
    expect(() => divide(10, 0)).toThrow('ゼロ除算エラー')
  })
})

describe('isEven', () => {
  test('正常系: 偶数の判定', () => {
    expect(isEven(2)).toStrictEqual(true)
    expect(isEven(4)).toStrictEqual(true)
    expect(isEven(100)).toStrictEqual(true)
  })

  test('正常系: 奇数の判定', () => {
    expect(isEven(1)).toStrictEqual(false)
    expect(isEven(3)).toStrictEqual(false)
    expect(isEven(99)).toStrictEqual(false)
  })

  test('正常系: 負の数の判定', () => {
    expect(isEven(-2)).toStrictEqual(true)
    expect(isEven(-3)).toStrictEqual(false)
  })

  test('境界値: ゼロの判定', () => {
    expect(isEven(0)).toStrictEqual(true)
  })
})

describe('sum', () => {
  test('正常系: 複数要素の合計', () => {
    expect(sum([1, 2, 3, 4, 5])).toStrictEqual(15)
  })

  test('正常系: 負の数を含む合計', () => {
    expect(sum([1, -2, 3, -4])).toStrictEqual(-2)
  })

  test('正常系: 単一要素の配列', () => {
    expect(sum([5])).toStrictEqual(5)
  })

  test('境界値: 空配列の合計', () => {
    expect(sum([])).toStrictEqual(0)
  })

  test('境界値: ゼロのみの配列', () => {
    expect(sum([0, 0, 0])).toStrictEqual(0)
  })

  test('境界値: 小数を含む配列', () => {
    expect(sum([0.1, 0.2, 0.3])).toBeCloseTo(0.6, 10)
  })
})

describe('average', () => {
  test('正常系: 複数要素の平均', () => {
    expect(average([2, 4, 6, 8])).toStrictEqual(5)
  })

  test('正常系: 負の数を含む平均', () => {
    expect(average([1, -1, 3, -3])).toStrictEqual(0)
  })

  test('正常系: 単一要素の配列', () => {
    expect(average([5])).toStrictEqual(5)
  })

  test('正常系: 小数の平均', () => {
    expect(average([1.5, 2.5, 3.5])).toBeCloseTo(2.5, 10)
  })

  test('異常系: 空配列でエラーが発生する', () => {
    expect(() => average([])).toThrow('空配列の平均値は計算できません')
  })
})