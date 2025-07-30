import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createMockPrismaContext } from '../../utils/mock'

// Expressアプリケーションのセットアップ（実際のアプリをimportする想定）
const createApp = () => {
  const app = express()
  app.use(express.json())
  
  // ミドルウェアの例
  app.use((req, res, next) => {
    req.context = createMockPrismaContext()
    next()
  })
  
  // ルートハンドラーの例
  app.get('/api/users', async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query
      const users = await req.context.prisma.user.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      })
      res.json({ users, page: Number(page), limit: Number(limit) })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })
  
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await req.context.prisma.user.findUnique({
        where: { id: req.params.id },
      })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      res.json(user)
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  })
  
  app.post('/api/users', async (req, res) => {
    try {
      const { name, email } = req.body
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' })
      }
      
      const user = await req.context.prisma.user.create({
        data: { name, email },
      })
      res.status(201).json(user)
    } catch (error) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Email already exists' })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })
  
  app.put('/api/users/:id', async (req, res) => {
    try {
      const { name, email } = req.body
      const user = await req.context.prisma.user.update({
        where: { id: req.params.id },
        data: { name, email },
      })
      res.json(user)
    } catch (error) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })
  
  app.delete('/api/users/:id', async (req, res) => {
    try {
      await req.context.prisma.user.delete({
        where: { id: req.params.id },
      })
      res.status(204).send()
    } catch (error) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'User not found' })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })
  
  return app
}

describe('GET /api/users', () => {
  let app: express.Application
  let mockContext: ReturnType<typeof createMockPrismaContext>
  
  beforeEach(() => {
    app = createApp()
    mockContext = createMockPrismaContext()
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('ユーザー一覧を正しく取得できること', async () => {
    const mockUsers = [
      { id: '1', name: '田中太郎', email: 'tanaka@example.com' },
      { id: '2', name: '佐藤花子', email: 'sato@example.com' },
    ]
    
    mockContext.prisma.user.findMany.mockResolvedValue(mockUsers)
    
    const response = await request(app)
      .get('/api/users')
      .expect(200)
    
    expect(response.body).toStrictEqual({
      users: mockUsers,
      page: 1,
      limit: 10,
    })
    
    expect(mockContext.prisma.user.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
    })
  })

  test('ページネーションが正しく動作すること', async () => {
    const mockUsers = [
      { id: '11', name: 'ユーザー11', email: 'user11@example.com' },
      { id: '12', name: 'ユーザー12', email: 'user12@example.com' },
    ]
    
    mockContext.prisma.user.findMany.mockResolvedValue(mockUsers)
    
    const response = await request(app)
      .get('/api/users?page=2&limit=5')
      .expect(200)
    
    expect(response.body).toStrictEqual({
      users: mockUsers,
      page: 2,
      limit: 5,
    })
    
    expect(mockContext.prisma.user.findMany).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
    })
  })

  test('DBエラー時に500エラーを返すこと', async () => {
    mockContext.prisma.user.findMany.mockRejectedValue(new Error('DB Error'))
    
    const response = await request(app)
      .get('/api/users')
      .expect(500)
    
    expect(response.body).toStrictEqual({
      error: 'Internal server error',
    })
  })
})

describe('GET /api/users/:id', () => {
  let app: express.Application
  let mockContext: ReturnType<typeof createMockPrismaContext>
  
  beforeEach(() => {
    app = createApp()
    mockContext = createMockPrismaContext()
  })

  test('存在するユーザーを取得できること', async () => {
    const mockUser = {
      id: 'user-123',
      name: '山田太郎',
      email: 'yamada@example.com',
    }
    
    mockContext.prisma.user.findUnique.mockResolvedValue(mockUser)
    
    const response = await request(app)
      .get('/api/users/user-123')
      .expect(200)
    
    expect(response.body).toStrictEqual(mockUser)
    expect(mockContext.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    })
  })

  test('存在しないユーザーで404を返すこと', async () => {
    mockContext.prisma.user.findUnique.mockResolvedValue(null)
    
    const response = await request(app)
      .get('/api/users/non-existent')
      .expect(404)
    
    expect(response.body).toStrictEqual({
      error: 'User not found',
    })
  })
})

describe('POST /api/users', () => {
  let app: express.Application
  let mockContext: ReturnType<typeof createMockPrismaContext>
  
  beforeEach(() => {
    app = createApp()
    mockContext = createMockPrismaContext()
  })

  test('新規ユーザーを作成できること', async () => {
    const newUser = {
      name: '新規ユーザー',
      email: 'new@example.com',
    }
    
    const createdUser = {
      id: 'new-user-id',
      ...newUser,
    }
    
    mockContext.prisma.user.create.mockResolvedValue(createdUser)
    
    const response = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(201)
    
    expect(response.body).toStrictEqual(createdUser)
    expect(mockContext.prisma.user.create).toHaveBeenCalledWith({
      data: newUser,
    })
  })

  test('必須フィールドが不足している場合400エラーを返すこと', async () => {
    const invalidData = { name: 'テストユーザー' }
    
    const response = await request(app)
      .post('/api/users')
      .send(invalidData)
      .expect(400)
    
    expect(response.body).toStrictEqual({
      error: 'Name and email are required',
    })
    expect(mockContext.prisma.user.create).not.toHaveBeenCalled()
  })

  test('メールアドレスが重複している場合409エラーを返すこと', async () => {
    const duplicateUser = {
      name: '重複ユーザー',
      email: 'existing@example.com',
    }
    
    const dbError = new Error('Unique constraint failed')
    dbError.code = 'P2002'
    mockContext.prisma.user.create.mockRejectedValue(dbError)
    
    const response = await request(app)
      .post('/api/users')
      .send(duplicateUser)
      .expect(409)
    
    expect(response.body).toStrictEqual({
      error: 'Email already exists',
    })
  })
})

describe('PUT /api/users/:id', () => {
  let app: express.Application
  let mockContext: ReturnType<typeof createMockPrismaContext>
  
  beforeEach(() => {
    app = createApp()
    mockContext = createMockPrismaContext()
  })

  test('ユーザー情報を更新できること', async () => {
    const updateData = {
      name: '更新後の名前',
      email: 'updated@example.com',
    }
    
    const updatedUser = {
      id: 'user-123',
      ...updateData,
    }
    
    mockContext.prisma.user.update.mockResolvedValue(updatedUser)
    
    const response = await request(app)
      .put('/api/users/user-123')
      .send(updateData)
      .expect(200)
    
    expect(response.body).toStrictEqual(updatedUser)
    expect(mockContext.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: updateData,
    })
  })

  test('存在しないユーザーの更新で404エラーを返すこと', async () => {
    const dbError = new Error('Record not found')
    dbError.code = 'P2025'
    mockContext.prisma.user.update.mockRejectedValue(dbError)
    
    const response = await request(app)
      .put('/api/users/non-existent')
      .send({ name: 'test' })
      .expect(404)
    
    expect(response.body).toStrictEqual({
      error: 'User not found',
    })
  })
})

describe('DELETE /api/users/:id', () => {
  let app: express.Application
  let mockContext: ReturnType<typeof createMockPrismaContext>
  
  beforeEach(() => {
    app = createApp()
    mockContext = createMockPrismaContext()
  })

  test('ユーザーを削除できること', async () => {
    mockContext.prisma.user.delete.mockResolvedValue({
      id: 'user-123',
      name: '削除されるユーザー',
      email: 'deleted@example.com',
    })
    
    const response = await request(app)
      .delete('/api/users/user-123')
      .expect(204)
    
    expect(response.body).toStrictEqual({})
    expect(mockContext.prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    })
  })

  test('存在しないユーザーの削除で404エラーを返すこと', async () => {
    const dbError = new Error('Record not found')
    dbError.code = 'P2025'
    mockContext.prisma.user.delete.mockRejectedValue(dbError)
    
    const response = await request(app)
      .delete('/api/users/non-existent')
      .expect(404)
    
    expect(response.body).toStrictEqual({
      error: 'User not found',
    })
  })
})