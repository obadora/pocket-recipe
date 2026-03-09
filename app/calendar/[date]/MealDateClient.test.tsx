import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockCreateMealRecord, mockDeleteMealRecord, mockRouterRefresh } = vi.hoisted(() => ({
  mockCreateMealRecord: vi.fn(),
  mockDeleteMealRecord: vi.fn(),
  mockRouterRefresh: vi.fn(),
}))

vi.mock('../../meal-records/actions', () => ({
  createMealRecord: mockCreateMealRecord,
  deleteMealRecord: mockDeleteMealRecord,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}))

import MealDateClient from './MealDateClient'

const makeRecipe = (id: string, title: string) => ({
  id,
  title,
  description: null,
  servings: null,
  cookTime: null,
  categories: [] as Array<{ category: { id: string; name: string } }>,
})

const makeMealRecord = (id: string, recipeId: string, title: string) => ({
  id,
  recipeId,
  date: new Date('2026-03-15'),
  recipe: { id: recipeId, title },
})

const defaultProps = {
  date: '2026-03-15',
  recipes: [makeRecipe('r1', '肉じゃが'), makeRecipe('r2', 'カレーライス')],
  mealRecords: [] as ReturnType<typeof makeMealRecord>[],
}

describe('MealDateClient', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全レシピ一覧が表示される', () => {
    render(<MealDateClient {...defaultProps} />)
    expect(screen.getByText('肉じゃが')).toBeInTheDocument()
    expect(screen.getByText('カレーライス')).toBeInTheDocument()
  })

  it('登録済みレシピが表示される', () => {
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが')]} />)
    expect(screen.getByTestId('registered-r1')).toBeInTheDocument()
  })

  it('登録済みレシピ名をクリックすると /recipes/:id へリンクされている', () => {
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが')]} />)
    const link = screen.getByRole('link', { name: '肉じゃが' })
    expect(link).toHaveAttribute('href', '/recipes/r1')
  })

  it('削除ボタンで deleteMealRecord を呼び refresh する', async () => {
    const user = userEvent.setup()
    mockDeleteMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが')]} />)
    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(mockDeleteMealRecord).toHaveBeenCalledWith('m1')
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('追加ボタンで createMealRecord を呼び refresh する', async () => {
    const user = userEvent.setup()
    mockCreateMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} />)
    const addButtons = screen.getAllByRole('button', { name: '追加' })
    await user.click(addButtons[0])
    expect(mockCreateMealRecord).toHaveBeenCalledWith({ recipeId: 'r1', date: '2026-03-15' })
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('検索ボックスでレシピを絞り込める', async () => {
    const user = userEvent.setup()
    render(<MealDateClient {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('レシピを検索...'), 'カレー')
    expect(screen.queryByText('肉じゃが')).not.toBeInTheDocument()
    expect(screen.getByText('カレーライス')).toBeInTheDocument()
  })

  it('検索結果が0件のときメッセージを表示する', async () => {
    const user = userEvent.setup()
    render(<MealDateClient {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('レシピを検索...'), 'zzz')
    expect(screen.getByText('該当するレシピがありません')).toBeInTheDocument()
  })
})
