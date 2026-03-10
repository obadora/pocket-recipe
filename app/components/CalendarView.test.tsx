import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockRouterPush } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

import CalendarView from './CalendarView'

const makeRecipe = (id: string, title: string) => ({
  id,
  title,
  description: null,
  servings: null,
  cookTime: null,
  categories: [],
})

const makeMealRecord = (id: string, recipeId: string, date: Date, title: string) => ({
  id,
  recipeId,
  date,
  recipe: { id: recipeId, title },
})

describe('CalendarView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('7列（日〜土）のヘッダーを表示する', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    for (const day of ['日', '月', '火', '水', '木', '金', '土']) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('当月の日付セルが正しく表示される', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    expect(screen.getByTestId('cell-2026-03-01')).toBeInTheDocument()
    expect(screen.getByTestId('cell-2026-03-31')).toBeInTheDocument()
  })

  it('mealRecords がある日にレシピタイトルが表示される', () => {
    const records = [makeMealRecord('meal-1', 'recipe-1', new Date('2026-03-09'), '肉じゃが')]
    render(<CalendarView mealRecords={records} recipes={[makeRecipe('recipe-1', '肉じゃが')]} initialMonth={new Date('2026-03-01')} />)
    expect(screen.getByText('肉じゃが')).toBeInTheDocument()
  })

  it('前月ボタンで月が変わる', async () => {
    const user = userEvent.setup()
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    expect(screen.getByText('2026年3月')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前月' }))
    expect(screen.getByText('2026年2月')).toBeInTheDocument()
  })

  it('翌月ボタンで月が変わる', async () => {
    const user = userEvent.setup()
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    await user.click(screen.getByRole('button', { name: '翌月' }))
    expect(screen.getByText('2026年4月')).toBeInTheDocument()
  })

  it('当月の日付クリックで /calendar/YYYY-MM-DD へ遷移する', async () => {
    const user = userEvent.setup()
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    await user.click(screen.getByTestId('cell-2026-03-15'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calendar/2026-03-15')
  })

  it('前月・翌月セルをクリックしても遷移する', async () => {
    const user = userEvent.setup()
    // 2026-04-01 は水曜 → 3/29,30,31 が前月セル
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-04-01')} />)
    await user.click(screen.getByTestId('cell-2026-03-31'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calendar/2026-03-31')
  })

  it('前月の末尾日付が薄く表示される（2026年4月表示時、3月末が見える）', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-04-01')} />)
    const cell = screen.getByTestId('cell-2026-03-31')
    expect(cell).toBeInTheDocument()
    const span = cell.querySelector('span')
    expect(span).toHaveClass('text-zinc-300')
  })

  it('当月末の後に翌月の日付が薄く表示される', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    const cell = screen.getByTestId('cell-2026-04-01')
    expect(cell).toBeInTheDocument()
    const span = cell.querySelector('span')
    expect(span).toHaveClass('text-zinc-300')
  })

  it('土曜列のヘッダーが青色クラスを持つ', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    expect(screen.getByTestId('day-header-6')).toHaveClass('text-blue-500')
  })

  it('日曜列のヘッダーが赤色クラスを持つ', () => {
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    expect(screen.getByTestId('day-header-0')).toHaveClass('text-red-500')
  })

  it('土曜日セルの日付数字が青色クラスを持つ', () => {
    // 2026-03-07 は土曜
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    const span = screen.getByTestId('cell-2026-03-07').querySelector('span')
    expect(span).toHaveClass('text-blue-500')
  })

  it('日曜日セルの日付数字が赤色クラスを持つ', () => {
    // 2026-03-08 は日曜
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-03-01')} />)
    const span = screen.getByTestId('cell-2026-03-08').querySelector('span')
    expect(span).toHaveClass('text-red-500')
  })

  it('祝日セルの日付数字が赤色クラスを持つ', () => {
    // 2026-01-01 は元日
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-01-01')} />)
    const span = screen.getByTestId('cell-2026-01-01').querySelector('span')
    expect(span).toHaveClass('text-red-500')
  })

  it('祝日名がセル内に表示される', () => {
    // 2026-01-01 は元日
    render(<CalendarView mealRecords={[]} recipes={[]} initialMonth={new Date('2026-01-01')} />)
    expect(screen.getByText('元日')).toBeInTheDocument()
  })
})
