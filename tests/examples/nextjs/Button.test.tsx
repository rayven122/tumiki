import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// サンプルButtonコンポーネント（実際のコンポーネントをimportする想定）
const Button = ({ 
  onClick, 
  disabled, 
  loading, 
  children, 
  variant = 'primary' 
}: {
  onClick?: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`btn btn-${variant}`}
    aria-busy={loading}
  >
    {loading ? 'Loading...' : children}
  </button>
)

describe('Button', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('通常のクリックイベントが正しく発火すること', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledOnce()
    expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
  })

  test('disabled状態でクリックできないこと', async () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    )
    
    const button = screen.getByRole('button', { name: 'Disabled Button' })
    await user.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
  })

  test('loading状態で適切に表示されること', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} loading>
        Submit
      </Button>
    )
    
    const button = screen.getByRole('button', { name: 'Loading...' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Submit')).not.toBeInTheDocument()
  })

  test('非同期処理中にloading状態になること', async () => {
    const asyncOperation = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
    
    const AsyncButton = () => {
      const [loading, setLoading] = React.useState(false)
      
      const handleClick = async () => {
        setLoading(true)
        await asyncOperation()
        setLoading(false)
      }
      
      return (
        <Button onClick={handleClick} loading={loading}>
          Process
        </Button>
      )
    }
    
    render(<AsyncButton />)
    const button = screen.getByRole('button', { name: 'Process' })
    
    // クリック前の状態確認
    expect(button).not.toBeDisabled()
    
    // クリック実行
    await user.click(button)
    
    // loading状態の確認
    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()
    expect(asyncOperation).toHaveBeenCalledOnce()
    
    // 非同期処理完了待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Process' })).toBeInTheDocument()
    })
    
    expect(button).not.toBeDisabled()
  })

  test('異なるvariantで適切なクラスが適用されること', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-secondary')
    
    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-danger')
  })

  test('複数回のクリックが防止されること', async () => {
    const handleClick = vi.fn()
    let clickCount = 0
    
    const DebounceButton = () => {
      const [processing, setProcessing] = React.useState(false)
      
      const onClick = async () => {
        if (processing) return
        
        setProcessing(true)
        clickCount++
        await handleClick()
        setTimeout(() => setProcessing(false), 500)
      }
      
      return (
        <Button onClick={onClick} disabled={processing}>
          Click Once
        </Button>
      )
    }
    
    render(<DebounceButton />)
    const button = screen.getByRole('button')
    
    // 素早く3回クリック
    await user.tripleClick(button)
    
    // 1回だけ処理されることを確認
    expect(clickCount).toBe(1)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  test('エラー発生時に適切にハンドリングされること', async () => {
    const errorMessage = 'Something went wrong'
    const handleClick = vi.fn().mockRejectedValue(new Error(errorMessage))
    
    const ErrorButton = () => {
      const [error, setError] = React.useState<string | null>(null)
      
      const onClick = async () => {
        try {
          await handleClick()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      }
      
      return (
        <>
          <Button onClick={onClick}>Try Action</Button>
          {error && <div role="alert">{error}</div>}
        </>
      )
    }
    
    render(<ErrorButton />)
    
    await user.click(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage)
    })
  })
})