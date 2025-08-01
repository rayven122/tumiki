import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'

// React Testing Library カスタムレンダー
export const render = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const AllTheProviders = ({ children }: { children: ReactNode }) => {
    // ここに必要なプロバイダーをラップ
    return <>{children}</>
  }

  return rtlRender(ui, { wrapper: AllTheProviders, ...options })
}

// 非同期処理待機ヘルパー
export const waitFor = (
  condition: () => boolean | Promise<boolean>,
  options?: { timeout?: number; interval?: number }
): Promise<void> => {
  const { timeout = 5000, interval = 50 } = options || {}
  
  return new Promise((resolve, reject) => {
    const start = Date.now()
    
    const check = async () => {
      try {
        const result = await condition()
        if (result) {
          resolve()
        } else if (Date.now() - start > timeout) {
          reject(new Error(`Timeout after ${timeout}ms waiting for condition`))
        } else {
          setTimeout(check, interval)
        }
      } catch (error) {
        reject(error)
      }
    }
    
    check()
  })
}

// デバウンス処理のテストヘルパー
export const flushPromises = () => {
  return new Promise((resolve) => setImmediate(resolve))
}

// タイマーモックヘルパー
export const setupTimerMocks = () => {
  vi.useFakeTimers()
  
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  }
}

// LocalStorage/SessionStorageモック
export const setupStorageMock = () => {
  const storage: Record<string, string> = {}
  
  const storageMock = {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key])
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(storage)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(storage).length
    },
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    writable: true,
  })
  
  Object.defineProperty(window, 'sessionStorage', {
    value: storageMock,
    writable: true,
  })
  
  return storageMock
}

// フォームデータ作成ヘルパー
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData()
  
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, String(item)))
    } else {
      formData.append(key, String(value))
    }
  })
  
  return formData
}

// ファイルモック作成ヘルパー
export const createFileMock = (
  name: string,
  size: number,
  type: string
): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// イベントモックヘルパー
export const createEventMock = (type: string, props?: any) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, props)
  return event
}

// テストデータビルダー基底クラス
export class TestDataBuilder<T> {
  protected data: Partial<T> = {}
  
  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value
    return this
  }
  
  build(): T {
    return this.data as T
  }
  
  buildMany(count: number, customizer?: (index: number) => Partial<T>): T[] {
    return Array.from({ length: count }, (_, index) => ({
      ...this.data,
      ...(customizer?.(index) || {}),
    })) as T[]
  }
}