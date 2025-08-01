import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { createMockHttpContext } from '../../utils/mock'

// 認証ミドルウェアの例
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    // トークン検証（実際の実装では JWT 検証など）
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    
    req.user = decoded
    next()
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' })
  }
}

// レート制限ミドルウェアの例
const rateLimitMiddleware = (limit: number, windowMs: number) => {
  const requests = new Map<string, number[]>()
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || '127.0.0.1'
    const now = Date.now()
    const windowStart = now - windowMs
    
    // 古いリクエストを削除
    const userRequests = requests.get(ip) || []
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart)
    
    if (recentRequests.length >= limit) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      })
    }
    
    recentRequests.push(now)
    requests.set(ip, recentRequests)
    
    next()
  }
}

// ロギングミドルウェアの例
const loggingMiddleware = (logger: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    
    // レスポンス終了時のログ
    res.on('finish', () => {
      const duration = Date.now() - start
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
      })
    })
    
    next()
  }
}

// バリデーションミドルウェアの例
const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body)
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map((d: any) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      })
    }
    
    req.body = value
    next()
  }
}

// モック関数
const verifyToken = vi.fn()

describe('認証ミドルウェア', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: NextFunction
  
  beforeEach(() => {
    const context = createMockHttpContext()
    mockReq = context.req
    mockRes = context.res
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  test('有効なトークンで認証が成功すること', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    mockReq.headers.authorization = 'Bearer valid-token'
    verifyToken.mockResolvedValue(mockUser)
    
    await authMiddleware(mockReq, mockRes, mockNext)
    
    expect(verifyToken).toHaveBeenCalledWith('valid-token')
    expect(mockReq.user).toStrictEqual(mockUser)
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  test('トークンが提供されていない場合401エラーを返すこと', async () => {
    delete mockReq.headers.authorization
    
    await authMiddleware(mockReq, mockRes, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('無効なトークンで401エラーを返すこと', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token'
    verifyToken.mockResolvedValue(null)
    
    await authMiddleware(mockReq, mockRes, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('トークン検証エラー時に500エラーを返すこと', async () => {
    mockReq.headers.authorization = 'Bearer error-token'
    verifyToken.mockRejectedValue(new Error('Token verification failed'))
    
    await authMiddleware(mockReq, mockRes, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication error' })
    expect(mockNext).not.toHaveBeenCalled()
  })
})

describe('レート制限ミドルウェア', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: NextFunction
  let middleware: ReturnType<typeof rateLimitMiddleware>
  
  beforeEach(() => {
    const context = createMockHttpContext()
    mockReq = context.req
    mockRes = context.res
    mockNext = vi.fn()
    middleware = rateLimitMiddleware(3, 60000) // 1分間に3リクエストまで
    vi.clearAllMocks()
  })

  test('制限内のリクエストは通過すること', () => {
    mockReq.ip = '192.168.1.1'
    
    // 3回のリクエスト
    for (let i = 0; i < 3; i++) {
      middleware(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(i + 1)
      expect(mockRes.status).not.toHaveBeenCalled()
    }
  })

  test('制限を超えたリクエストは429エラーを返すこと', () => {
    mockReq.ip = '192.168.1.2'
    
    // 3回まで成功
    for (let i = 0; i < 3; i++) {
      middleware(mockReq, mockRes, mockNext)
    }
    
    // 4回目で制限
    mockNext.mockClear()
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(429)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Too many requests',
      retryAfter: 60,
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('異なるIPアドレスは別々にカウントされること', () => {
    // IP1: 2回リクエスト
    mockReq.ip = '192.168.1.3'
    middleware(mockReq, mockRes, mockNext)
    middleware(mockReq, mockRes, mockNext)
    
    // IP2: 3回リクエスト（制限内）
    mockReq.ip = '192.168.1.4'
    middleware(mockReq, mockRes, mockNext)
    middleware(mockReq, mockRes, mockNext)
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockNext).toHaveBeenCalledTimes(5)
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  test('時間経過後はリクエストカウントがリセットされること', () => {
    mockReq.ip = '192.168.1.5'
    const timers = setupTimerMocks()
    
    // 3回リクエスト（制限まで）
    for (let i = 0; i < 3; i++) {
      middleware(mockReq, mockRes, mockNext)
    }
    
    // 時間を進める（61秒後）
    timers.advance(61000)
    
    // 新しいリクエストは通過する
    mockNext.mockClear()
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockRes.status).not.toHaveBeenCalled()
    
    timers.restore()
  })
})

describe('ロギングミドルウェア', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: NextFunction
  let mockLogger: any
  
  beforeEach(() => {
    const context = createMockHttpContext()
    mockReq = context.req
    mockRes = {
      ...context.res,
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          // すぐにコールバックを実行
          callback()
        }
      }),
      statusCode: 200,
    }
    mockNext = vi.fn()
    mockLogger = { info: vi.fn() }
  })

  test('リクエスト情報が正しくログに記録されること', () => {
    mockReq.method = 'GET'
    mockReq.url = '/api/users'
    mockReq.headers['user-agent'] = 'Mozilla/5.0'
    
    const middleware = loggingMiddleware(mockLogger)
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/api/users',
        status: 200,
        userAgent: 'Mozilla/5.0',
        duration: expect.any(Number),
      })
    )
  })

  test('エラーレスポンスも正しくログに記録されること', () => {
    mockReq.method = 'POST'
    mockReq.url = '/api/users'
    mockRes.statusCode = 400
    
    const middleware = loggingMiddleware(mockLogger)
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/users',
        status: 400,
        duration: expect.any(Number),
      })
    )
  })
})

describe('バリデーションミドルウェア', () => {
  let mockReq: any
  let mockRes: any
  let mockNext: NextFunction
  
  beforeEach(() => {
    const context = createMockHttpContext()
    mockReq = context.req
    mockRes = context.res
    mockNext = vi.fn()
  })

  test('有効なデータでバリデーションが成功すること', () => {
    const schema = {
      validate: vi.fn().mockReturnValue({
        error: null,
        value: { name: 'テスト', email: 'test@example.com' },
      }),
    }
    
    mockReq.body = { name: 'テスト', email: 'test@example.com' }
    
    const middleware = validateBody(schema)
    middleware(mockReq, mockRes, mockNext)
    
    expect(schema.validate).toHaveBeenCalledWith(mockReq.body)
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockRes.status).not.toHaveBeenCalled()
  })

  test('無効なデータで400エラーを返すこと', () => {
    const schema = {
      validate: vi.fn().mockReturnValue({
        error: {
          details: [
            { path: ['email'], message: 'メールアドレスの形式が正しくありません' },
            { path: ['name'], message: '名前は必須です' },
          ],
        },
        value: null,
      }),
    }
    
    mockReq.body = { email: 'invalid-email' }
    
    const middleware = validateBody(schema)
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Validation error',
      details: [
        { field: 'email', message: 'メールアドレスの形式が正しくありません' },
        { field: 'name', message: '名前は必須です' },
      ],
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('バリデーション後にデータが整形されること', () => {
    const schema = {
      validate: vi.fn().mockReturnValue({
        error: null,
        value: { 
          name: 'テスト',
          email: 'test@example.com',
          isActive: true, // デフォルト値が追加された
        },
      }),
    }
    
    mockReq.body = { name: 'テスト', email: 'test@example.com' }
    
    const middleware = validateBody(schema)
    middleware(mockReq, mockRes, mockNext)
    
    expect(mockReq.body).toStrictEqual({
      name: 'テスト',
      email: 'test@example.com',
      isActive: true,
    })
    expect(mockNext).toHaveBeenCalledOnce()
  })
})