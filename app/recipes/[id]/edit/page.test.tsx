import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockUpdateRecipe, mockRouterBack, mockSupabaseGetUser, mockSupabaseUpload, mockSupabaseGetPublicUrl } = vi.hoisted(() => ({
  mockUpdateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockSupabaseGetUser: vi.fn(),
  mockSupabaseUpload: vi.fn(),
  mockSupabaseGetPublicUrl: vi.fn(),
}))

vi.mock('../../actions', () => ({
  updateRecipe: mockUpdateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

vi.mock('../../../utils/imageConverter', () => ({
  convertImage: vi.fn().mockImplementation((file: File) =>
    Promise.resolve({ convertedFile: file, previewUrl: 'blob:mock' })
  ),
}))

vi.mock('../../../utils/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getUser: mockSupabaseGetUser },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mockSupabaseUpload,
        getPublicUrl: mockSupabaseGetPublicUrl,
      }),
    },
  }),
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
  imageUrl: null as string | null,
}

describe('EditRecipeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('各セクション（写真・基本情報・カテゴリ・材料・手順）が表示される', () => {
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    expect(screen.getByText('写真')).toBeInTheDocument()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('材料')).toBeInTheDocument()
    expect(screen.getByText('手順')).toBeInTheDocument()
  })

  it('既存の imageUrl がある場合に現在の写真が表示される', () => {
    render(
      <EditRecipeForm
        recipeId="recipe-1"
        initialValues={{ ...defaultInitialValues, imageUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/photos/user-1/photo.jpg' }}
      />
    )

    expect(screen.getByRole('img', { name: '現在の写真' })).toBeInTheDocument()
  })

  it('新しいファイルを選択するとプレビューが表示される', async () => {
    const user = userEvent.setup()
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'プレビュー' })).toBeInTheDocument()
    })
  })

  it('写真付きで送信すると storage.upload が呼ばれ updateRecipe に imageUrl が渡される', async () => {
    const user = userEvent.setup()
    mockSupabaseUpload.mockResolvedValue({ data: { path: 'photos/user-1/uuid.jpg' }, error: null })
    mockSupabaseGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/photos/user-1/uuid.jpg' } })
    mockUpdateRecipe.mockResolvedValue(undefined)
    render(<EditRecipeForm recipeId="recipe-1" initialValues={defaultInitialValues} />)

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)
    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(mockSupabaseUpload).toHaveBeenCalled()
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        'recipe-1',
        expect.objectContaining({ imageUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/photos/user-1/uuid.jpg' })
      )
    })
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
