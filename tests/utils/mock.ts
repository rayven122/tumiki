import { vi } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'

// Prismaモックコンテキストの作成
export const createMockPrismaContext = () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mcpServer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userMcpServerConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(this.prisma)),
    $disconnect: vi.fn(),
  },
})

// tRPCコンテキストモックの作成
export const createMockTRPCContext = (overrides?: Partial<any>) => ({
  session: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      organizationId: 'test-org-id',
    },
  },
  db: createMockPrismaContext().prisma,
  ...overrides,
})

// HTTPリクエスト/レスポンスモックの作成
export const createMockHttpContext = () => ({
  req: {
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
    },
    body: {},
    query: {},
    params: {},
    method: 'GET',
    url: '/',
  },
  res: {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  },
  next: vi.fn(),
})

// Auth0セッションモックの作成
export const createMockAuth0Session = () => ({
  user: {
    sub: 'auth0|test-user-id',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    updated_at: new Date().toISOString(),
  },
  idToken: 'mock-id-token',
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
})

// APIレスポンスモックヘルパー
export const mockApiResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'OK',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  blob: vi.fn(),
  arrayBuffer: vi.fn(),
  formData: vi.fn(),
  clone: vi.fn(),
})

// 非同期処理のモックヘルパー
export const mockAsync = <T>(value: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay)
  })
}

// エラーモックヘルパー
export const mockError = (message: string, code?: string) => {
  const error = new Error(message)
  if (code) {
    (error as any).code = code
  }
  return error
}