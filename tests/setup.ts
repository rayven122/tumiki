import { beforeEach, afterEach, vi } from 'vitest'

// グローバルモックの設定
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}

// テスト環境のセットアップ
beforeEach(() => {
  // 各テスト前の共通セットアップ
  vi.clearAllMocks()
})

afterEach(() => {
  // 各テスト後のクリーンアップ
  vi.restoreAllMocks()
})

// 環境変数のモック
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// グローバルに利用可能なテストユーティリティ
global.testUtils = {
  waitFor: (condition: () => boolean, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval)
          resolve()
        } else if (Date.now() - start > timeout) {
          clearInterval(interval)
          reject(new Error('Timeout waiting for condition'))
        }
      }, 50)
    })
  },
}

// TypeScriptの型定義
declare global {
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>
  }
}