import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockParseRecipe, mockCreateRecipe, mockRouterBack, mockPrepareImageForCrop, mockPrepareImagesForUpload, mockSearchParamsGet } = vi.hoisted(() => ({
  mockParseRecipe: vi.fn(),
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockPrepareImageForCrop: vi.fn(),
  mockPrepareImagesForUpload: vi.fn(),
  mockSearchParamsGet: vi.fn().mockReturnValue(null),
}))

vi.mock('../../../utils/recipeParser', () => ({
  parseRecipeFromImages: mockParseRecipe,
}))

vi.mock('../../actions', () => ({
  createRecipe: mockCreateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

vi.mock('../../../utils/imageConverter', () => ({
  prepareImageForCrop: mockPrepareImageForCrop,
  prepareImagesForUpload: mockPrepareImagesForUpload,
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
    mockPrepareImagesForUpload.mockResolvedValue([
      { file: new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' }), previewUrl: 'blob:mock' },
    ])
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

  it('from パラメータがある場合: createRecipe の第2引数に渡される', async () => {
    const user = userEvent.setup()
    mockSearchParamsGet.mockReturnValue('/calendar/2026-03-14')
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)
    await waitFor(() => screen.getByDisplayValue('カレーライス'))
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'カレーライス' }),
        '/calendar/2026-03-14'
      )
    })
  })

  it('from パラメータがない場合: createRecipe の第2引数は undefined', async () => {
    const user = userEvent.setup()
    mockSearchParamsGet.mockReturnValue(null)
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<FromPhotoPage />)

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await uploadAndConfirmCrop(user, file)
    await waitFor(() => screen.getByDisplayValue('カレーライス'))
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'カレーライス' }),
        undefined
      )
    })
  })

  describe('複数画像', () => {
    it('2枚選択するとクロップUIが表示されず、サムネイルが表示される', async () => {
      const user = userEvent.setup()
      const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })
      mockPrepareImagesForUpload.mockResolvedValue([
        { file: file1, previewUrl: 'blob:mock1' },
        { file: file2, previewUrl: 'blob:mock2' },
      ])
      render(<FromPhotoPage />)

      await user.upload(screen.getByLabelText('写真を選択'), [file1, file2])

      await waitFor(() => {
        expect(screen.queryByText('この範囲で決定')).not.toBeInTheDocument()
        expect(screen.getByText('2枚選択中')).toBeInTheDocument()
      })
    })

    it('2枚選択すると parseRecipeFromImages が全ファイルで呼ばれる', async () => {
      const user = userEvent.setup()
      const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })
      mockPrepareImagesForUpload.mockResolvedValue([
        { file: file1, previewUrl: 'blob:mock1' },
        { file: file2, previewUrl: 'blob:mock2' },
      ])
      render(<FromPhotoPage />)

      await user.upload(screen.getByLabelText('写真を選択'), [file1, file2])

      await waitFor(() => {
        expect(mockParseRecipe).toHaveBeenCalledWith([file1, file2])
      })
    })

    it('1枚選択は引き続きクロップUIが表示される（回帰）', async () => {
      const user = userEvent.setup()
      render(<FromPhotoPage />)

      const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
      await user.upload(screen.getByLabelText('写真を選択'), file)

      await waitFor(() => {
        expect(screen.getByText('この範囲で決定')).toBeInTheDocument()
      })
    })

    it('サムネイルの×ボタンで画像を削除できる', async () => {
      const user = userEvent.setup()
      const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })
      mockPrepareImagesForUpload.mockResolvedValue([
        { file: file1, previewUrl: 'blob:mock1' },
        { file: file2, previewUrl: 'blob:mock2' },
      ])
      render(<FromPhotoPage />)

      await user.upload(screen.getByLabelText('写真を選択'), [file1, file2])
      await waitFor(() => screen.getByText('2枚選択中'))

      const removeButtons = screen.getAllByRole('button', { name: '削除' })
      await user.click(removeButtons[1])

      await waitFor(() => {
        expect(screen.getByText('1枚選択中')).toBeInTheDocument()
      })
    })

    it('6枚選択するとエラーメッセージが表示され、parseRecipeFromImages は呼ばれない', async () => {
      const user = userEvent.setup()
      render(<FromPhotoPage />)

      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['a'], `photo${i}.jpg`, { type: 'image/jpeg' })
      )
      await user.upload(screen.getByLabelText('写真を選択'), files)

      await waitFor(() => {
        expect(screen.getByText(/5枚以下/)).toBeInTheDocument()
      })
      expect(mockParseRecipe).not.toHaveBeenCalled()
    })

    it('5枚選択は許可される', async () => {
      const user = userEvent.setup()
      const files = Array.from({ length: 5 }, (_, i) =>
        new File(['a'], `photo${i}.jpg`, { type: 'image/jpeg' })
      )
      mockPrepareImagesForUpload.mockResolvedValue(
        files.map((f, i) => ({ file: f, previewUrl: `blob:mock${i}` }))
      )
      render(<FromPhotoPage />)

      await user.upload(screen.getByLabelText('写真を選択'), files)

      await waitFor(() => {
        expect(screen.getByText('5枚選択中')).toBeInTheDocument()
      })
    })

    it('複数画像パスの解析エラーがエラーメッセージを表示する', async () => {
      const user = userEvent.setup()
      mockParseRecipe.mockRejectedValue(new Error('parse failed'))
      const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })
      mockPrepareImagesForUpload.mockResolvedValue([
        { file: file1, previewUrl: 'blob:mock1' },
        { file: file2, previewUrl: 'blob:mock2' },
      ])
      render(<FromPhotoPage />)

      await user.upload(screen.getByLabelText('写真を選択'), [file1, file2])

      await waitFor(() => {
        expect(screen.getByText(/解析に失敗しました/)).toBeInTheDocument()
      })
    })
  })
})
