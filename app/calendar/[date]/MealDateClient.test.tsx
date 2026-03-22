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
  images: [] as Array<{ url: string; isMain: boolean; order: number }>,
  categories: [] as Array<{ category: { id: string; name: string } }>,
})

const makeMealRecord = (id: string, recipeId: string, title: string, type = 'ate', mealTime: string | null = null) => ({
  id,
  recipeId,
  date: new Date('2026-03-15'),
  type,
  mealTime,
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
    const link = screen.getByTestId('registered-r1').querySelector('a')
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

  it('追加ボタンクリックで「食べた」「作った」の選択肢が表示される', async () => {
    const user = userEvent.setup()
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    expect(screen.getByRole('button', { name: '食べた' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '作った' })).toBeInTheDocument()
  })

  it('「食べた」選択後に朝/昼/夜の選択肢が表示される', async () => {
    const user = userEvent.setup()
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    await user.click(screen.getByRole('button', { name: '食べた' }))
    expect(screen.getByRole('button', { name: '朝' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '昼' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '夜' })).toBeInTheDocument()
  })

  it('「作った」選択後は朝/昼/夜が表示されず直接登録できる', async () => {
    const user = userEvent.setup()
    mockCreateMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    await user.click(screen.getByRole('button', { name: '作った' }))
    expect(screen.queryByRole('button', { name: '朝' })).not.toBeInTheDocument()
    expect(mockCreateMealRecord).toHaveBeenCalledWith({
      recipeId: 'r1',
      date: '2026-03-15',
      type: 'cooked',
      mealTime: null,
    })
  })

  it('食べた＋昼で登録すると type=ate, mealTime=lunch で呼ばれる', async () => {
    const user = userEvent.setup()
    mockCreateMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    await user.click(screen.getByRole('button', { name: '食べた' }))
    await user.click(screen.getByRole('button', { name: '昼' }))
    expect(mockCreateMealRecord).toHaveBeenCalledWith({
      recipeId: 'r1',
      date: '2026-03-15',
      type: 'ate',
      mealTime: 'lunch',
    })
    expect(mockRouterRefresh).toHaveBeenCalled()
  })

  it('食べた＋朝で登録すると type=ate, mealTime=breakfast で呼ばれる', async () => {
    const user = userEvent.setup()
    mockCreateMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    await user.click(screen.getByRole('button', { name: '食べた' }))
    await user.click(screen.getByRole('button', { name: '朝' }))
    expect(mockCreateMealRecord).toHaveBeenCalledWith({
      recipeId: 'r1',
      date: '2026-03-15',
      type: 'ate',
      mealTime: 'breakfast',
    })
  })

  it('食べた＋夜で登録すると type=ate, mealTime=dinner で呼ばれる', async () => {
    const user = userEvent.setup()
    mockCreateMealRecord.mockResolvedValue(undefined)
    render(<MealDateClient {...defaultProps} />)
    await user.click(screen.getAllByRole('button', { name: '追加' })[0])
    await user.click(screen.getByRole('button', { name: '食べた' }))
    await user.click(screen.getByRole('button', { name: '夜' }))
    expect(mockCreateMealRecord).toHaveBeenCalledWith({
      recipeId: 'r1',
      date: '2026-03-15',
      type: 'ate',
      mealTime: 'dinner',
    })
  })

  it('登録済みレコードに type=ate, mealTime=lunch で「食べた / 昼」が表示される', () => {
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが', 'ate', 'lunch')]} />)
    expect(screen.getByText('食べた / 昼')).toBeInTheDocument()
  })

  it('登録済みレコードの type=cooked に「作った」が表示される', () => {
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが', 'cooked', null)]} />)
    expect(screen.getByText('作った')).toBeInTheDocument()
  })

  it('登録済みレコードの type=ate, mealTime=null に「食べた」が表示される', () => {
    render(<MealDateClient {...defaultProps} mealRecords={[makeMealRecord('m1', 'r1', '肉じゃが', 'ate', null)]} />)
    expect(screen.getByText('食べた')).toBeInTheDocument()
  })

  it('レシピ作成リンク: 手動で作成のhrefが正しい', () => {
    render(<MealDateClient {...defaultProps} />)
    const link = screen.getByRole('link', { name: '手動で作成' })
    expect(link).toHaveAttribute('href', `/recipes/new?from=/calendar/${defaultProps.date}`)
  })

  it('レシピ作成リンク: URLから作成のhrefが正しい', () => {
    render(<MealDateClient {...defaultProps} />)
    const link = screen.getByRole('link', { name: 'URLから作成' })
    expect(link).toHaveAttribute('href', `/recipes/new/from-url?from=/calendar/${defaultProps.date}`)
  })

  it('レシピ作成リンク: 写真から作成のhrefが正しい', () => {
    render(<MealDateClient {...defaultProps} />)
    const link = screen.getByRole('link', { name: '写真から作成' })
    expect(link).toHaveAttribute('href', `/recipes/new/from-photo?from=/calendar/${defaultProps.date}`)
  })
})
