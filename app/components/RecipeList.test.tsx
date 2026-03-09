import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecipeList from './RecipeList'

const makeRecipe = (overrides = {}) => ({
  id: 'recipe-1',
  title: '肉じゃが',
  description: null,
  servings: null,
  cookTime: null,
  categories: [],
  ...overrides,
})

describe('RecipeList', () => {
  it('0件のとき空状態メッセージを表示する', () => {
    render(<RecipeList recipes={[]} />)
    expect(screen.getByText('レシピがまだありません。')).toBeInTheDocument()
  })

  it('レシピのタイトルを表示する', () => {
    render(<RecipeList recipes={[makeRecipe()]} />)
    expect(screen.getByText('肉じゃが')).toBeInTheDocument()
  })

  it('カテゴリタグを表示する', () => {
    render(
      <RecipeList
        recipes={[
          makeRecipe({
            categories: [{ category: { id: 'cat-1', name: '和食' } }],
          }),
        ]}
      />
    )
    expect(screen.getByText('和食')).toBeInTheDocument()
  })

  it('各レシピが /recipes/{id} リンクになっている', () => {
    render(<RecipeList recipes={[makeRecipe({ id: 'abc' })]} />)
    const link = screen.getByRole('link', { name: /肉じゃが/ })
    expect(link).toHaveAttribute('href', '/recipes/abc')
  })
})
