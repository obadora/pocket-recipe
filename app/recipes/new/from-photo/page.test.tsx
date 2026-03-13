import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockParseRecipe, mockCreateRecipe, mockRouterBack, mockPrepareImageForCrop } = vi.hoisted(() => ({
  mockParseRecipe: vi.fn(),
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockPrepareImageForCrop: vi.fn(),
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
  prepareImageForCrop: mockPrepareImageForCrop,
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

// Mock react-image-crop to render a simple img wrapper
vi.mock('react-image-crop', async () => {
  const React = await import('react')
  return {
    default: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'react-crop' }, children),
    centerCrop: vi.fn((c) => c),
    makeAspectCrop: vi.fn(() => ({ unit: '%', width: 90, x: 0, y: 0, height: 90 })),
  }
})

// Mock canvas toBlob and getContext
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: function (cb: (b: Blob | null) => void) {
    cb(new Blob(['img'], { type: 'image/jpeg' }))
  },
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    drawImage: vi.fn(),
  }),
})

// Mock HTMLImageElement natural dimensions
Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { get: () => 100 })
Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { get: () => 100 })

import FromPhotoPage from './page'

const validRecipe: ParsedRecipe = {
  title: 'カレーライス',
  description: '定番カレー',
  servings: 4,
  cookTime: 30,
  ingredients: [{ name: '玉ねぎ', amount: '1', unit: '個' }],
  steps: ['玉ねぎを炒める', 'カレールーを加える'],
}

// Helper: upload a file and confirm the crop
async function uploadAndConfirmCrop(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(screen.getByLabelText('写真を選択'), file)
  await waitFor(() => expect(screen.getByText('この範囲で決定')).toBeInTheDocument())
  await user.click(screen.getByText('この範囲で決定'))
}

describe('FromPhotoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrepareImageForCrop.mockResolvedValue('blob:mock')
    mockParseRecipe.mockResolvedValue(validRecipe)
  })

  it('初期表示では写真アップロードエリアのみ表示', () => {
    render(<FromPhotoPage />)
    expect(screen.getByText('タップして写真を選択')).toBeInTheDocument()
  })

  it('画像選択後にクロップUIが表示される', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)

    await waitFor(() => {
      expect(screen.getByText('この範囲で決定')).toBeInTheDocument()
    })
  })

  it('クロップ確定後にプレビューが表示される', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'プレビュー' })).toBeInTheDocument()
    })
  })

  it('クロップ確定後に自動で parseRecipeFromImage が呼ばれ、フォームに自動入力される', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)

    await waitFor(() => {
      expect(mockParseRecipe).toHaveBeenCalled()
      expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument()
      expect(screen.getByDisplayValue('定番カレー')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })
  })

  it('解析中は "画像読み取り中・・・" が表示される', async () => {
    const user = userEvent.setup()
    let resolvePromise!: (v: ParsedRecipe) => void
    mockParseRecipe.mockReturnValue(new Promise<ParsedRecipe>((resolve) => { resolvePromise = resolve }))
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)

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
    await uploadAndConfirmCrop(user, file)

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
    await uploadAndConfirmCrop(user, file)

    await waitFor(() => expect(mockParseRecipe).toHaveBeenCalled())
    expect(screen.getByDisplayValue('手動タイトル')).toBeInTheDocument()
  })

  it('解析完了後も手動で編集できる', async () => {
    const user = userEvent.setup()
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)

    await waitFor(() => screen.getByDisplayValue('カレーライス'))
    const titleInput = screen.getByDisplayValue('カレーライス')
    await user.clear(titleInput)
    await user.type(titleInput, '編集後タイトル')

    expect(screen.getByDisplayValue('編集後タイトル')).toBeInTheDocument()
  })
})
