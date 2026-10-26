import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('./WeekView', () => ({ default: () => <div>WeekView</div> }))
vi.mock('./RecipeList', () => ({
  default: ({ recipes }: { recipes: Array<{ title: string }> }) => (
    <div>
      RecipeList
      <ul>{recipes.map((r) => <li key={r.title}>{r.title}</li>)}</ul>
    </div>
  ),
}))
vi.mock('./AccountTab', () => ({ default: () => <div>AccountTab</div> }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('../(auth)/actions', () => ({ signOut: vi.fn() }))
vi.mock('./AddRecipeDropdown', () => ({ default: () => <div>AddRecipeDropdown</div> }))

import HomeTabs from './HomeTabs'

const defaultUser = { email: 'test@example.com', username: null, provider: 'email' }
const defaultProps = { recipes: [], mealRecords: [], user: defaultUser, recipeCount: 0 }

const makeRecipe = (id: string, title: string, ingredientNames: string[]) => ({
  id,
  title,
  description: null,
  servings: null,
  cookTime: null,
  images: [],
  categories: [],
  ingredients: ingredientNames.map((name) => ({ name })),
})

const searchableRecipes = [
  makeRecipe('1', '肉じゃが', ['じゃがいも', '牛肉', '玉ねぎ']),
  makeRecipe('2', 'チキンカレー', ['鶏肉', '玉ねぎ', 'カレールー']),
  makeRecipe('3', 'グリーンサラダ', ['レタス', 'きゅうり']),
]

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

  describe('材料で検索', () => {
    it('リストタブに材料検索ボックスが表示される', () => {
      render(<HomeTabs {...defaultProps} recipes={searchableRecipes} recipeCount={3} />)
      expect(screen.getByRole('searchbox', { name: '材料で検索' })).toBeInTheDocument()
    })

    it('入力した材料を含むレシピだけが表示される', async () => {
      const user = userEvent.setup()
      render(<HomeTabs {...defaultProps} recipes={searchableRecipes} recipeCount={3} />)
      await user.type(screen.getByRole('searchbox', { name: '材料で検索' }), '玉ねぎ')
      expect(screen.getByText('肉じゃが')).toBeInTheDocument()
      expect(screen.getByText('チキンカレー')).toBeInTheDocument()
      expect(screen.queryByText('グリーンサラダ')).not.toBeInTheDocument()
    })

    it('検索中はヒット件数を表示する', async () => {
      const user = userEvent.setup()
      render(<HomeTabs {...defaultProps} recipes={searchableRecipes} recipeCount={3} />)
      await user.type(screen.getByRole('searchbox', { name: '材料で検索' }), '鶏肉')
      expect(screen.getByText('3件中1件のレシピ')).toBeInTheDocument()
    })

    it('該当するレシピがないときはメッセージを表示する', async () => {
      const user = userEvent.setup()
      render(<HomeTabs {...defaultProps} recipes={searchableRecipes} recipeCount={3} />)
      await user.type(screen.getByRole('searchbox', { name: '材料で検索' }), 'さば')
      expect(screen.getByText('「さば」を使うレシピは見つかりませんでした')).toBeInTheDocument()
      expect(screen.queryByText('RecipeList')).not.toBeInTheDocument()
    })

    it('レシピが0件のときは検索ボックスを表示しない', () => {
      render(<HomeTabs {...defaultProps} />)
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })
  })
})
