import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockCreateRecipe, mockRouterBack } = vi.hoisted(() => ({
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
}))

vi.mock('../actions', () => ({
  createRecipe: mockCreateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

import NewRecipePage from './page'

describe('NewRecipePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フォームの各セクションが表示される', () => {
    render(<NewRecipePage />)

    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('材料')).toBeInTheDocument()
    expect(screen.getByText('手順')).toBeInTheDocument()
  })

  it('タイトルが空のまま送信するとエラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    expect(screen.getByText('タイトルを入力してください。')).toBeInTheDocument()
    expect(mockCreateRecipe).not.toHaveBeenCalled()
  })

  it('タイトルを入力して送信すると createRecipe が呼ばれる', async () => {
    const user = userEvent.setup()
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '肉じゃが')
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ title: '肉じゃが' })
      )
    })
  })

  it('「+ 材料を追加」を押すと材料の入力行が増える', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const before = screen.getAllByPlaceholderText('材料名').length
    await user.click(screen.getByRole('button', { name: '+ 材料を追加' }))
    const after = screen.getAllByPlaceholderText('材料名').length

    expect(after).toBe(before + 1)
  })

  it('材料が2行以上の時に × を押すと行が削除される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: '+ 材料を追加' }))
    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(2)

    const deleteButtons = screen.getAllByRole('button', { name: '×' })
    await user.click(deleteButtons[0])

    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(1)
  })

  it('「+ 手順を追加」を押すと手順の入力欄が増える', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const before = screen.getAllByPlaceholderText(/手順 \d/).length
    await user.click(screen.getByRole('button', { name: '+ 手順を追加' }))
    const after = screen.getAllByPlaceholderText(/手順 \d/).length

    expect(after).toBe(before + 1)
  })

  it('カテゴリを入力して追加ボタンを押すとタグが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 和食、夕食、お弁当'), '和食')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('和食')).toBeInTheDocument()
  })

  it('カテゴリのタグの × を押すとタグが削除される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 和食、夕食、お弁当'), '和食')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByText('和食')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText('和食')).not.toBeInTheDocument()
  })

  it('「戻る」「キャンセル」を押すと router.back() が呼ばれる', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: '← 戻る' }))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(mockRouterBack).toHaveBeenCalledTimes(2)
  })
})
