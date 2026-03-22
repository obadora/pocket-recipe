import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./WeekView', () => ({ default: () => <div>WeekView</div> }))
vi.mock('./RecipeList', () => ({ default: () => <div>RecipeList</div> }))
vi.mock('./AccountTab', () => ({ default: () => <div>AccountTab</div> }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('../(auth)/actions', () => ({ signOut: vi.fn() }))
vi.mock('./AddRecipeDropdown', () => ({ default: () => <div>AddRecipeDropdown</div> }))

import HomeTabs from './HomeTabs'

const defaultUser = { email: 'test@example.com', username: null, provider: 'email' }
const defaultProps = { recipes: [], mealRecords: [], user: defaultUser, recipeCount: 0 }

describe('HomeTabs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('リスト・カレンダー・アカウントタブが表示される', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'リスト' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'カレンダー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'アカウント' })).toBeInTheDocument()
  })

  it('デフォルトでリストタブが選択されRecipeListが表示される', () => {
    render(<HomeTabs {...defaultProps} />)
    expect(screen.getByText('RecipeList')).toBeInTheDocument()
    expect(screen.queryByText('WeekView')).not.toBeInTheDocument()
  })

  it('カレンダータブクリックでWeekViewが表示される', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'カレンダー' }))
    expect(screen.getByText('WeekView')).toBeInTheDocument()
    expect(screen.queryByText('RecipeList')).not.toBeInTheDocument()
  })

  it('カレンダーからリストタブに戻れる', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'カレンダー' }))
    await user.click(screen.getByRole('button', { name: 'リスト' }))
    expect(screen.getByText('RecipeList')).toBeInTheDocument()
    expect(screen.queryByText('WeekView')).not.toBeInTheDocument()
  })

  it('ヘッダーはどのタブでも表示されない', () => {
    render(<HomeTabs {...defaultProps} user={{ email: 'hello@example.com', username: null, provider: 'email' }} />)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('アカウントタブクリックで AccountTab が表示される', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'アカウント' }))
    expect(screen.getByText('AccountTab')).toBeInTheDocument()
  })

  it('リストタブではレシピ件数が表示される', () => {
    render(<HomeTabs {...defaultProps} recipeCount={5} />)
    expect(screen.getByText('5件のレシピ')).toBeInTheDocument()
  })

  it('カレンダータブではレシピ件数が非表示になる', async () => {
    const user = userEvent.setup()
    render(<HomeTabs {...defaultProps} recipeCount={5} />)
    await user.click(screen.getByRole('button', { name: 'カレンダー' }))
    expect(screen.queryByText('5件のレシピ')).not.toBeInTheDocument()
  })

  it('ボトムタブバーが常に表示される', () => {
    render(<HomeTabs {...defaultProps} />)
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
  })
})
