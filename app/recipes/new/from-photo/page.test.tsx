import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockParseRecipe, mockCreateRecipe, mockRouterBack, mockConvertImage } = vi.hoisted(() => ({
  mockParseRecipe: vi.fn(),
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockConvertImage: vi.fn(),
}))

vi.mock('../../../utils/recipeParser', () => ({
  parseRecipeFromImage: mockParseRecipe,
}))

vi.mock('../../actions', () => ({
  createRecipe: mockCreateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

vi.mock('../../../utils/imageConverter', () => ({
  convertImage: mockConvertImage,
}))

vi.mock('../../../utils/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      }),
    },
  }),
}))

import FromPhotoPage from './page'

const validRecipe: ParsedRecipe = {
  title: 'カレーライス',
  description: '定番カレー',
  servings: 4,
  cookTime: 30,
  ingredients: [{ name: '玉ねぎ', amount: '1', unit: '個' }],
  steps: ['玉ねぎを炒める', 'カレールーを加える'],
}

describe('FromPhotoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConvertImage.mockImplementation((file: File) =>
      Promise.resolve({ convertedFile: file, previewUrl: 'blob:mock' })
    )
    mockParseRecipe.mockResolvedValue(validRecipe)
  })

  it('初期表示では写真アップロードエリアのみ表示', () => {
    render(<FromPhotoPage />)

    expect(screen.getByText('タップして写真を選択')).toBeInTheDocument()
  })

  it('画像選択後にプレビューが表示される', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'プレビュー' })).toBeInTheDocument()
    })
  })

  it('画像選択後に自動で parseRecipeFromImage が呼ばれ、フォームに自動入力される', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(mockParseRecipe).toHaveBeenCalled()
      expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument()
      expect(screen.getByDisplayValue('定番カレー')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })
  })

  it('解析中は "AI解析中..." が表示される', async () => {
    const user = userEvent.setup()
    let resolvePromise!: (v: ParsedRecipe) => void
    mockParseRecipe.mockReturnValue(new Promise<ParsedRecipe>((resolve) => { resolvePromise = resolve }))
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(screen.getByText('画像読み取り中・・・')).toBeInTheDocument()
    })

    resolvePromise(validRecipe)
  })

  it('解析失敗時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    mockParseRecipe.mockRejectedValue(new Error('parse failed'))
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(screen.getByText(/解析に失敗しました/)).toBeInTheDocument()
    })
  })

  it('null フィールドがある場合は既存入力を上書きしない', async () => {
    const user = userEvent.setup()
    const partial: ParsedRecipe = {
      title: null,
      description: null,
      servings: null,
      cookTime: null,
      ingredients: [],
      steps: [],
    }
    mockParseRecipe.mockResolvedValue(partial)
    render(<FromPhotoPage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '手動タイトル')

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => expect(mockParseRecipe).toHaveBeenCalled())
    expect(screen.getByDisplayValue('手動タイトル')).toBeInTheDocument()
  })

  it('解析完了後も手動で編集できる', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => screen.getByDisplayValue('カレーライス'))
    const titleInput = screen.getByDisplayValue('カレーライス')
    await user.clear(titleInput)
    await user.type(titleInput, '編集後タイトル')

    expect(screen.getByDisplayValue('編集後タイトル')).toBeInTheDocument()
  })
})
