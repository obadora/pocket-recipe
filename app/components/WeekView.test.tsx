import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockRouterPush } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

import WeekView from './WeekView'

// 固定の基準日: 2026-03-09(月) 〜 2026-03-15(日) の週
const MONDAY = new Date('2026-03-09T00:00:00')

const makeMealRecord = (
  id: string,
  recipeId: string,
  title: string,
  date: string,
  type: string,
  mealTime: string | null,
) => ({
  id,
  recipeId,
  date: new Date(date + 'T00:00:00'),
  type,
  mealTime,
  recipe: { id: recipeId, title },
})

const defaultProps = {
  mealRecords: [] as ReturnType<typeof makeMealRecord>[],
  recipes: [],
  initialDate: MONDAY,
}

describe('WeekView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('前週・翌週ボタンが表示される', () => {
    render(<WeekView {...defaultProps} />)
    expect(screen.getByRole('button', { name: '前週' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '翌週' })).toBeInTheDocument()
  })

  it('initialDate を含む週の7日分が表示される', () => {
    render(<WeekView {...defaultProps} />)
    // 2026-03-09(月)〜2026-03-15(日)
    expect(screen.getByText('3/9')).toBeInTheDocument()
    expect(screen.getByText('3/15')).toBeInTheDocument()
  })

  it('週の範囲ラベルが表示される', () => {
    render(<WeekView {...defaultProps} />)
    expect(screen.getByText(/3月9日.*3月15日/)).toBeInTheDocument()
  })

  it('フィルターボタン「すべて / 食べた / 作った」が表示される', () => {
    render(<WeekView {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '食べた' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '作った' })).toBeInTheDocument()
  })

  it('type=ate, mealTime=lunch の記録が「昼」ラベルで表示される', () => {
    const records = [makeMealRecord('m1', 'r1', 'カレー', '2026-03-09', 'ate', 'lunch')]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    expect(screen.getByText('昼')).toBeInTheDocument()
    expect(screen.getByText('カレー')).toBeInTheDocument()
  })

  it('type=ate, mealTime=breakfast の記録が「朝」ラベルで表示される', () => {
    const records = [makeMealRecord('m1', 'r1', 'トースト', '2026-03-09', 'ate', 'breakfast')]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    expect(screen.getByText('朝')).toBeInTheDocument()
    expect(screen.getByText('トースト')).toBeInTheDocument()
  })

  it('type=ate, mealTime=dinner の記録が「夜」ラベルで表示される', () => {
    const records = [makeMealRecord('m1', 'r1', '肉じゃが', '2026-03-09', 'ate', 'dinner')]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    expect(screen.getByText('夜')).toBeInTheDocument()
    expect(screen.getByText('肉じゃが')).toBeInTheDocument()
  })

  it('type=cooked の記録が「作」バッジで表示される', () => {
    const records = [makeMealRecord('m1', 'r1', '唐揚げ', '2026-03-09', 'cooked', null)]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    expect(screen.getByText('作')).toBeInTheDocument()
    expect(screen.getByText('唐揚げ')).toBeInTheDocument()
  })

  it('フィルター「食べた」で cooked 記録が非表示になる', async () => {
    const user = userEvent.setup()
    const records = [
      makeMealRecord('m1', 'r1', 'カレー', '2026-03-09', 'ate', 'lunch'),
      makeMealRecord('m2', 'r2', '唐揚げ', '2026-03-09', 'cooked', null),
    ]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    await user.click(screen.getByRole('button', { name: '食べた' }))
    expect(screen.getByText('カレー')).toBeInTheDocument()
    expect(screen.queryByText('唐揚げ')).not.toBeInTheDocument()
  })

  it('フィルター「作った」で ate 記録が非表示になる', async () => {
    const user = userEvent.setup()
    const records = [
      makeMealRecord('m1', 'r1', 'カレー', '2026-03-09', 'ate', 'lunch'),
      makeMealRecord('m2', 'r2', '唐揚げ', '2026-03-09', 'cooked', null),
    ]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    await user.click(screen.getByRole('button', { name: '作った' }))
    expect(screen.queryByText('カレー')).not.toBeInTheDocument()
    expect(screen.getByText('唐揚げ')).toBeInTheDocument()
  })

  it('フィルター「すべて」で全記録が表示される', async () => {
    const user = userEvent.setup()
    const records = [
      makeMealRecord('m1', 'r1', 'カレー', '2026-03-09', 'ate', 'lunch'),
      makeMealRecord('m2', 'r2', '唐揚げ', '2026-03-09', 'cooked', null),
    ]
    render(<WeekView {...defaultProps} mealRecords={records} />)
    await user.click(screen.getByRole('button', { name: '作った' }))
    await user.click(screen.getByRole('button', { name: 'すべて' }))
    expect(screen.getByText('カレー')).toBeInTheDocument()
    expect(screen.getByText('唐揚げ')).toBeInTheDocument()
  })

  it('前週ボタンで週が切り替わる', async () => {
    const user = userEvent.setup()
    render(<WeekView {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: '前週' }))
    expect(screen.getByText('3/2')).toBeInTheDocument()
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('翌週ボタンで週が切り替わる', async () => {
    const user = userEvent.setup()
    render(<WeekView {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: '翌週' }))
    expect(screen.getByText('3/16')).toBeInTheDocument()
    expect(screen.getByText('3/22')).toBeInTheDocument()
  })

  it('日付クリックで /calendar/YYYY-MM-DD へ遷移する', async () => {
    const user = userEvent.setup()
    render(<WeekView {...defaultProps} />)
    await user.click(screen.getByTestId('day-row-2026-03-09'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calendar/2026-03-09')
  })
})
