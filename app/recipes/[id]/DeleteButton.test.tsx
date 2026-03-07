import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockDeleteRecipe } = vi.hoisted(() => ({
  mockDeleteRecipe: vi.fn(),
}))

vi.mock('../actions', () => ({
  deleteRecipe: mockDeleteRecipe,
}))

import DeleteButton from './DeleteButton'

describe('DeleteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
  })

  it('「レシピを削除」ボタンが表示される', () => {
    render(<DeleteButton recipeId="recipe-1" />)
    expect(screen.getByRole('button', { name: 'レシピを削除' })).toBeInTheDocument()
  })

  it('クリックすると confirm ダイアログが表示される', async () => {
    const user = userEvent.setup()
    render(<DeleteButton recipeId="recipe-1" />)

    await user.click(screen.getByRole('button', { name: 'レシピを削除' }))

    expect(window.confirm).toHaveBeenCalledWith('このレシピを削除してもよろしいですか？')
  })

  it('confirm キャンセル時: deleteRecipe が呼ばれない', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    const user = userEvent.setup()
    render(<DeleteButton recipeId="recipe-1" />)

    await user.click(screen.getByRole('button', { name: 'レシピを削除' }))

    expect(mockDeleteRecipe).not.toHaveBeenCalled()
  })

  it('confirm OK 時: deleteRecipe(recipeId) が呼ばれる', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    mockDeleteRecipe.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<DeleteButton recipeId="recipe-1" />)

    await user.click(screen.getByRole('button', { name: 'レシピを削除' }))

    expect(mockDeleteRecipe).toHaveBeenCalledWith('recipe-1')
  })
})
