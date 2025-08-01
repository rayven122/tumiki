import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { mockRouter } from 'next-router-mock'
import { createMockTRPCContext } from '../../utils/mock'

// Next.jsのルーターモック
vi.mock('next/router', () => require('next-router-mock'))

// tRPCクライアントモック
const mockTRPC = {
  user: {
    getProfile: {
      useQuery: vi.fn(),
    },
  },
  post: {
    getLatest: {
      useQuery: vi.fn(),
    },
  },
}

vi.mock('@/utils/api', () => ({
  api: mockTRPC,
}))

// サンプルHomePageコンポーネント（実際のコンポーネントをimportする想定）
const HomePage = () => {
  const router = useRouter()
  const { data: userProfile, isLoading: userLoading } = api.user.getProfile.useQuery()
  const { data: latestPosts, isLoading: postsLoading } = api.post.getLatest.useQuery({ 
    limit: 10 
  })
  
  if (userLoading || postsLoading) {
    return <div>Loading...</div>
  }
  
  return (
    <div>
      <h1>Welcome, {userProfile?.name || 'Guest'}</h1>
      <section>
        <h2>Latest Posts</h2>
        {latestPosts?.length === 0 ? (
          <p>No posts yet</p>
        ) : (
          <ul>
            {latestPosts?.map((post) => (
              <li key={post.id}>
                <a href={`/posts/${post.id}`}>{post.title}</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.setCurrentUrl('/')
  })

  test('ローディング状態が正しく表示されること', () => {
    mockTRPC.user.getProfile.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    mockTRPC.post.getLatest.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    
    render(<HomePage />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('ユーザー情報と投稿一覧が正しく表示されること', async () => {
    const mockUser = {
      id: 'user-1',
      name: '山田太郎',
      email: 'yamada@example.com',
    }
    
    const mockPosts = [
      { id: '1', title: 'Vitestの使い方', createdAt: new Date() },
      { id: '2', title: 'Next.js 15の新機能', createdAt: new Date() },
      { id: '3', title: 'TypeScript 5.5リリース', createdAt: new Date() },
    ]
    
    mockTRPC.user.getProfile.useQuery.mockReturnValue({
      data: mockUser,
      isLoading: false,
    })
    mockTRPC.post.getLatest.useQuery.mockReturnValue({
      data: mockPosts,
      isLoading: false,
    })
    
    render(<HomePage />)
    
    // ユーザー名の表示確認
    expect(screen.getByText('Welcome, 山田太郎')).toBeInTheDocument()
    
    // 投稿一覧の表示確認
    expect(screen.getByText('Latest Posts')).toBeInTheDocument()
    mockPosts.forEach((post) => {
      expect(screen.getByText(post.title)).toBeInTheDocument()
    })
    
    // リンクの確認
    const firstPostLink = screen.getByText('Vitestの使い方')
    expect(firstPostLink).toHaveAttribute('href', '/posts/1')
  })

  test('ゲストユーザーの場合の表示が正しいこと', () => {
    mockTRPC.user.getProfile.useQuery.mockReturnValue({
      data: null,
      isLoading: false,
    })
    mockTRPC.post.getLatest.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
    })
    
    render(<HomePage />)
    
    expect(screen.getByText('Welcome, Guest')).toBeInTheDocument()
    expect(screen.getByText('No posts yet')).toBeInTheDocument()
  })

  test('APIエラー時のエラーハンドリングが正しく動作すること', () => {
    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      const [hasError, setHasError] = React.useState(false)
      
      React.useEffect(() => {
        const handleError = () => setHasError(true)
        window.addEventListener('error', handleError)
        return () => window.removeEventListener('error', handleError)
      }, [])
      
      if (hasError) {
        return <div role="alert">エラーが発生しました</div>
      }
      
      return <>{children}</>
    }
    
    mockTRPC.user.getProfile.useQuery.mockImplementation(() => {
      throw new Error('API Error')
    })
    
    render(
      <ErrorBoundary>
        <HomePage />
      </ErrorBoundary>
    )
    
    expect(screen.getByRole('alert')).toHaveTextContent('エラーが発生しました')
  })

  test('無限スクロールが正しく動作すること', async () => {
    const InfiniteScrollPage = () => {
      const [posts, setPosts] = React.useState<any[]>([])
      const [page, setPage] = React.useState(1)
      
      const { data, isLoading, isFetching } = api.post.getLatest.useQuery({
        limit: 10,
        page,
      })
      
      React.useEffect(() => {
        if (data) {
          setPosts((prev) => [...prev, ...data])
        }
      }, [data])
      
      const loadMore = () => {
        setPage((prev) => prev + 1)
      }
      
      return (
        <div>
          <ul>
            {posts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
          <button onClick={loadMore} disabled={isFetching}>
            {isFetching ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )
    }
    
    const firstBatch = [
      { id: '1', title: 'Post 1' },
      { id: '2', title: 'Post 2' },
    ]
    
    const secondBatch = [
      { id: '3', title: 'Post 3' },
      { id: '4', title: 'Post 4' },
    ]
    
    mockTRPC.post.getLatest.useQuery
      .mockReturnValueOnce({
        data: firstBatch,
        isLoading: false,
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: secondBatch,
        isLoading: false,
        isFetching: false,
      })
    
    const { rerender } = render(<InfiniteScrollPage />)
    
    // 初期データの確認
    expect(screen.getByText('Post 1')).toBeInTheDocument()
    expect(screen.getByText('Post 2')).toBeInTheDocument()
    
    // Load Moreボタンをクリック
    const loadMoreButton = screen.getByText('Load More')
    await userEvent.click(loadMoreButton)
    
    // 再レンダリング
    rerender(<InfiniteScrollPage />)
    
    // 追加データの確認
    await waitFor(() => {
      expect(screen.getByText('Post 3')).toBeInTheDocument()
      expect(screen.getByText('Post 4')).toBeInTheDocument()
    })
  })
})