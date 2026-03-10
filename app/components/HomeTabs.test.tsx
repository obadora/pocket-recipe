import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./CalendarView', () => ({ default: () => <div>CalendarView</div> }))
vi.mock('./RecipeList', () => ({ default: () => <div>RecipeList</div> }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import HomeTabs from './HomeTabs'

describe('HomeTabs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('リストタブとカレンダータブが表示される', () => {
    render(<HomeTabs recipes={[]} mealRecords={[]} />)
    expect(screen.getByRole('button', { name: 'リスト' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeInTheDocument()
  })

  it('デフォルトでリストタブが選択されRecipeListが表示される', () => {
    render(<HomeTabs recipes={[]} mealRecords={[]} />)
    expect(screen.getByText('RecipeList')).toBeInTheDocument()
    expect(screen.queryByText('CalendarView')).not.toBeInTheDocument()
  })

  it('カレンダータブクリックでCalendarViewが表示される', async () => {
    const user = userEvent.setup()
    render(<HomeTabs recipes={[]} mealRecords={[]} />)
    await user.click(screen.getByRole('button', { name: 'カレンダー' }))
    expect(screen.getByText('CalendarView')).toBeInTheDocument()
    expect(screen.queryByText('RecipeList')).not.toBeInTheDocument()
  })

  it('カレンダーからリストタブに戻れる', async () => {
    const user = userEvent.setup()
    render(<HomeTabs recipes={[]} mealRecords={[]} />)
    await user.click(screen.getByRole('button', { name: 'カレンダー' }))
    await user.click(screen.getByRole('button', { name: 'リスト' }))
    expect(screen.getByText('RecipeList')).toBeInTheDocument()
    expect(screen.queryByText('CalendarView')).not.toBeInTheDocument()
  })
})
