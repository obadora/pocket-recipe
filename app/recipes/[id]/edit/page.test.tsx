import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockUpdateRecipe, mockRouterBack } = vi.hoisted(() => ({
  mockUpdateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
}))

vi.mock('../../actions', () => ({
  updateRecipe: mockUpdateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

import EditRecipeForm from './EditRecipeForm'

const defaultInitialValues = {
  title: '肉じゃが',
  description: 'おふくろの味',
  servings: '4',
  cookTime: '30',
  ingredients: [{ name: 'じゃがいも', amount: '2', unit: '個' }],
  steps: [{ description: '具材を炒める' }],
  categories: ['和食'],
}

describe('EditRecipeForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('各セクション（基本情報・カテゴリ・材料・手順）が表示される', () => {
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('材料')).toBeInTheDocument()
    expect(screen.getByText('手順')).toBeInTheDocument()
  })

  it('initialValues がフォームに反映される', () => {
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    expect(screen.getByDisplayValue('肉じゃが')).toBeInTheDocument()
    expect(screen.getByDisplayValue('おふくろの味')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('じゃがいも')).toBeInTheDocument()
    expect(screen.getByDisplayValue('具材を炒める')).toBeInTheDocument()
    expect(screen.getByText('和食')).toBeInTheDocument()
  })

  it('タイトル空で送信するとエラーメッセージが表示され updateRecipe が呼ばれない', async () => {
    const user = userEvent.setup()
    render(
      <EditRecipeForm
        recipeId="recipe-1"
        initialValues={{ ...defaultInitialValues, title: '' }}
      />
    )

    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    expect(screen.getByText('タイトルを入力してください。')).toBeInTheDocument()
    expect(mockUpdateRecipe).not.toHaveBeenCalled()
  })

  it('送信で updateRecipe(recipeId, input) が呼ばれる', async () => {
    const user = userEvent.setup()
    mockUpdateRecipe.mockResolvedValue(undefined)
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        'recipe-1',
        expect.objectContaining({ title: '肉じゃが' })
      )
    })
  })

  it('「+ 材料を追加」を押すと材料の入力行が増える', async () => {
    const user = userEvent.setup()
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    const before = screen.getAllByPlaceholderText('材料名').length
    await user.click(screen.getByRole('button', { name: '+ 材料を追加' }))
    const after = screen.getAllByPlaceholderText('材料名').length

    expect(after).toBe(before + 1)
  })

  it('× を押すと材料行が削除される', async () => {
    const user = userEvent.setup()
    render(
      <EditRecipeForm
        recipeId="recipe-1"
        initialValues={{
          ...defaultInitialValues,
          categories: [],
          ingredients: [
            { name: 'じゃがいも', amount: '2', unit: '個' },
            { name: '玉ねぎ', amount: '1', unit: '個' },
          ],
        }}
      />
    )

    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(2)
    const deleteButtons = screen.getAllByRole('button', { name: '×' })
    await user.click(deleteButtons[0])
    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(1)
  })

  it('「+ 手順を追加」を押すと手順の入力欄が増える', async () => {
    const user = userEvent.setup()
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    const before = screen.getAllByPlaceholderText(/手順 \d/).length
    await user.click(screen.getByRole('button', { name: '+ 手順を追加' }))
    const after = screen.getAllByPlaceholderText(/手順 \d/).length

    expect(after).toBe(before + 1)
  })

  it('カテゴリを追加・削除できる', async () => {
    const user = userEvent.setup()
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    await user.type(screen.getByPlaceholderText('例: 和食、夕食、お弁当'), '夕食')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByText('夕食')).toBeInTheDocument()

    // 和食タグの × を押して削除
    const deleteButtons = screen.getAllByRole('button', { name: '×' })
    // カテゴリの × ボタンを特定（材料・手順の × とは別）
    await user.click(deleteButtons[deleteButtons.length - 1])
    expect(screen.queryByText('夕食')).not.toBeInTheDocument()
  })
})
