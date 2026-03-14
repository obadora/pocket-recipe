import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockParseRecipeFromUrl, mockCreateRecipe, mockRouterBack, mockSearchParamsGet } = vi.hoisted(() => ({
  mockParseRecipeFromUrl: vi.fn(),
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockSearchParamsGet: vi.fn().mockReturnValue(null),
}))

vi.mock('../../../utils/recipeUrlParser', () => ({
  parseRecipeFromUrl: mockParseRecipeFromUrl,
}))

vi.mock('../../actions', () => ({
  createRecipe: mockCreateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

import FromUrlPage from './page'

const validRecipe: ParsedRecipe = {
  title: 'カレーライス',
  description: '定番カレー',
  servings: 4,
  cookTime: 30,
  ingredients: [{ name: '玉ねぎ', amount: '1', unit: '個' }],
  steps: ['玉ねぎを炒める', 'カレールーを加える'],
}

describe('FromUrlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseRecipeFromUrl.mockResolvedValue(validRecipe)
  })

  it('初期表示: URL 入力フォームとフォームセクションが表示される', () => {
    render(<FromUrlPage />)

    expect(screen.getByPlaceholderText('https://example.com/recipe')).toBeInTheDocument()
    expect(screen.getByText('URLから読み込む')).toBeInTheDocument()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
  })

  it('URL 入力 → 読み込みボタン押下 → parseRecipeFromUrl が呼ばれる', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))

    await waitFor(() => {
      expect(mockParseRecipeFromUrl).toHaveBeenCalledWith('https://example.com/recipe')
    })
  })

  it('読み込み中: "URL読み取り中..." スピナーが表示され、ボタンが無効化される', async () => {
    const user = userEvent.setup()
    let resolvePromise!: (v: ParsedRecipe) => void
    mockParseRecipeFromUrl.mockReturnValue(new Promise<ParsedRecipe>((resolve) => { resolvePromise = resolve }))
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))

    await waitFor(() => {
      expect(screen.getByText('URL読み取り中...')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'URL読み取り中...' })).toBeDisabled()

    resolvePromise(validRecipe)
  })

  it('解析成功: フォームに自動入力される', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument()
      expect(screen.getByDisplayValue('定番カレー')).toBeInTheDocument()
      expect(screen.getByDisplayValue('4')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })
  })

  it('null フィールドがある場合: 既存入力を上書きしない', async () => {
    const user = userEvent.setup()
    const partial: ParsedRecipe = {
      title: null,
      description: null,
      servings: null,
      cookTime: null,
      ingredients: [],
      steps: [],
    }
    mockParseRecipeFromUrl.mockResolvedValue(partial)
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '手動タイトル')
    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))

    await waitFor(() => expect(mockParseRecipeFromUrl).toHaveBeenCalled())
    expect(screen.getByDisplayValue('手動タイトル')).toBeInTheDocument()
  })

  it('解析失敗: エラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    mockParseRecipeFromUrl.mockRejectedValue(new Error('parse failed'))
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))

    await waitFor(() => {
      expect(screen.getByText(/解析に失敗しました/)).toBeInTheDocument()
    })
  })

  it('URL 空の場合: バリデーションエラーが表示される', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.click(screen.getByText('URLから読み込む'))

    expect(screen.getByText('URLを入力してください。')).toBeInTheDocument()
    expect(mockParseRecipeFromUrl).not.toHaveBeenCalled()
  })

  it('不正 URL の場合: バリデーションエラーが表示される', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'not-a-url')
    await user.click(screen.getByText('URLから読み込む'))

    expect(screen.getByText('有効なURLを入力してください。')).toBeInTheDocument()
    expect(mockParseRecipeFromUrl).not.toHaveBeenCalled()
  })

  it('タイトル空で送信: エラーが表示される', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.click(screen.getByText('レシピを保存'))

    expect(screen.getByText('タイトルを入力してください。')).toBeInTheDocument()
    expect(mockCreateRecipe).not.toHaveBeenCalled()
  })

  it('送信時: createRecipe に sourceType:"url"、sourceUrl が渡される', async () => {
    const user = userEvent.setup()
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))
    await waitFor(() => expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument())

    await user.click(screen.getByText('レシピを保存'))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'url',
          sourceUrl: 'https://example.com/recipe',
        }),
        undefined
      )
    })
  })

  it('戻るボタン: router.back が呼ばれる', async () => {
    const user = userEvent.setup()
    render(<FromUrlPage />)

    await user.click(screen.getByText('← 戻る'))

    expect(mockRouterBack).toHaveBeenCalled()
  })

  it('from パラメータがある場合: createRecipe の第2引数に渡される', async () => {
    const user = userEvent.setup()
    mockSearchParamsGet.mockReturnValue('/calendar/2026-03-14')
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))
    await waitFor(() => expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument())
    await user.click(screen.getByText('レシピを保存'))

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
    render(<FromUrlPage />)

    await user.type(screen.getByPlaceholderText('https://example.com/recipe'), 'https://example.com/recipe')
    await user.click(screen.getByText('URLから読み込む'))
    await waitFor(() => expect(screen.getByDisplayValue('カレーライス')).toBeInTheDocument())
    await user.click(screen.getByText('レシピを保存'))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'カレーライス' }),
        undefined
      )
    })
  })
})
