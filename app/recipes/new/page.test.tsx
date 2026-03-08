import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockCreateRecipe, mockRouterBack, mockSupabaseGetUser, mockSupabaseUpload, mockSupabaseGetPublicUrl } = vi.hoisted(() => ({
  mockCreateRecipe: vi.fn(),
  mockRouterBack: vi.fn(),
  mockSupabaseGetUser: vi.fn(),
  mockSupabaseUpload: vi.fn(),
  mockSupabaseGetPublicUrl: vi.fn(),
}))

vi.mock('../actions', () => ({
  createRecipe: mockCreateRecipe,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

vi.mock('../../utils/imageConverter', () => ({
  convertImage: vi.fn().mockImplementation((file: File) =>
    Promise.resolve({ convertedFile: file, previewUrl: 'blob:mock' })
  ),
}))

vi.mock('../../utils/supabase/client', () => ({
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

import NewRecipePage from './page'

describe('NewRecipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('フォームの各セクションが表示される', () => {
    render(<NewRecipePage />)

    expect(screen.getByText('写真')).toBeInTheDocument()
    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('カテゴリ')).toBeInTheDocument()
    expect(screen.getByText('材料')).toBeInTheDocument()
    expect(screen.getByText('手順')).toBeInTheDocument()
  })

  it('ファイルを選択するとプレビューが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('写真を選択')
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'プレビュー' })).toBeInTheDocument()
    })
  })

  it('写真付きで送信すると storage.upload が呼ばれ createRecipe に imageUrl が渡される', async () => {
    const user = userEvent.setup()
    mockSupabaseUpload.mockResolvedValue({ data: { path: 'user-1/uuid.jpg' }, error: null })
    mockSupabaseGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/user-1/uuid.jpg' } })
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '肉じゃが')
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(mockSupabaseUpload).toHaveBeenCalled()
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/user-1/uuid.jpg' })
      )
    })
  })

  it('アップロード失敗時にエラーメッセージが表示され createRecipe は呼ばれない', async () => {
    const user = userEvent.setup()
    mockSupabaseUpload.mockResolvedValue({ data: null, error: { message: 'upload failed' } })
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '肉じゃが')
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), file)
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(screen.getByText(/写真のアップロードに失敗しました/)).toBeInTheDocument()
    })
    expect(mockCreateRecipe).not.toHaveBeenCalled()
  })

  it('10MB超のファイルを選択するとエラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('写真を選択'), largeFile)

    await waitFor(() => {
      expect(screen.getByText('ファイルサイズは10MB以下にしてください。')).toBeInTheDocument()
    })
  })

  it('タイトルが空のまま送信するとエラーメッセージが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    expect(screen.getByText('タイトルを入力してください。')).toBeInTheDocument()
    expect(mockCreateRecipe).not.toHaveBeenCalled()
  })

  it('タイトルを入力して送信すると createRecipe が呼ばれる', async () => {
    const user = userEvent.setup()
    mockCreateRecipe.mockResolvedValue(undefined)
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 肉じゃが'), '肉じゃが')
    await user.click(screen.getByRole('button', { name: 'レシピを保存' }))

    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ title: '肉じゃが' })
      )
    })
  })

  it('「+ 材料を追加」を押すと材料の入力行が増える', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const before = screen.getAllByPlaceholderText('材料名').length
    await user.click(screen.getByRole('button', { name: '+ 材料を追加' }))
    const after = screen.getAllByPlaceholderText('材料名').length

    expect(after).toBe(before + 1)
  })

  it('材料が2行以上の時に × を押すと行が削除される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: '+ 材料を追加' }))
    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(2)

    const deleteButtons = screen.getAllByRole('button', { name: '×' })
    await user.click(deleteButtons[0])

    expect(screen.getAllByPlaceholderText('材料名')).toHaveLength(1)
  })

  it('「+ 手順を追加」を押すと手順の入力欄が増える', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    const before = screen.getAllByPlaceholderText(/手順 \d/).length
    await user.click(screen.getByRole('button', { name: '+ 手順を追加' }))
    const after = screen.getAllByPlaceholderText(/手順 \d/).length

    expect(after).toBe(before + 1)
  })

  it('カテゴリを入力して追加ボタンを押すとタグが表示される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 和食、夕食、お弁当'), '和食')
    await user.click(screen.getByRole('button', { name: '追加' }))

    expect(screen.getByText('和食')).toBeInTheDocument()
  })

  it('カテゴリのタグの × を押すとタグが削除される', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.type(screen.getByPlaceholderText('例: 和食、夕食、お弁当'), '和食')
    await user.click(screen.getByRole('button', { name: '追加' }))
    expect(screen.getByText('和食')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText('和食')).not.toBeInTheDocument()
  })

  it('「戻る」「キャンセル」を押すと router.back() が呼ばれる', async () => {
    const user = userEvent.setup()
    render(<NewRecipePage />)

    await user.click(screen.getByRole('button', { name: '← 戻る' }))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(mockRouterBack).toHaveBeenCalledTimes(2)
  })
})
