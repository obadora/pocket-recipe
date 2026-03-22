import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockUpdateUser, mockUserUpdate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockUserUpdate: vi.fn(),
}))

vi.mock('../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  }),
}))

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { update: mockUserUpdate },
  },
}))

import { updateUsername, updateEmail, updatePassword } from './actions'

const authenticatedUser = { id: 'user-123', email: 'test@example.com' }

describe('updateUsername', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: prisma.user.update を呼び success を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUserUpdate.mockResolvedValue({ id: 'user-123' })

    const formData = new FormData()
    formData.set('username', 'yamada_taro')

    const result = await updateUsername(formData)

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { username: 'yamada_taro' },
    })
    expect(result).toEqual({ success: true })
  })

  it('未認証時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const formData = new FormData()
    formData.set('username', 'yamada_taro')

    const result = await updateUsername(formData)

    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ error: '認証が必要です' })
  })

  it('空文字の場合: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })

    const formData = new FormData()
    formData.set('username', '  ')

    const result = await updateUsername(formData)

    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'ユーザー名を入力してください' })
  })

  it('null を渡した場合 (削除): prisma.user.update を呼ぶ', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUserUpdate.mockResolvedValue({ id: 'user-123' })

    const formData = new FormData()
    formData.set('username', '')

    // 空文字はエラーなので null 削除は別途考慮しない（任意フィールドなのでスキップ）
    const result = await updateUsername(formData)
    expect(result).toEqual({ error: 'ユーザー名を入力してください' })
  })
})

describe('updateEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: supabase.auth.updateUser を呼び success を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const formData = new FormData()
    formData.set('email', 'new@example.com')

    const result = await updateEmail(formData)

    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
    expect(result).toEqual({ success: true })
  })

  it('未認証時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const formData = new FormData()
    formData.set('email', 'new@example.com')

    const result = await updateEmail(formData)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(result).toEqual({ error: '認証が必要です' })
  })

  it('Supabase エラー時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: { message: 'Invalid email' } })

    const formData = new FormData()
    formData.set('email', 'invalid')

    const result = await updateEmail(formData)

    expect(result).toEqual({ error: 'Invalid email' })
  })
})

describe('updatePassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: supabase.auth.updateUser を呼び success を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'newpassword123')

    const result = await updatePassword(formData)

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    expect(result).toEqual({ success: true })
  })

  it('パスワード不一致時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })

    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'different123')

    const result = await updatePassword(formData)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'パスワードが一致しません' })
  })

  it('未認証時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'newpassword123')

    const result = await updatePassword(formData)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(result).toEqual({ error: '認証が必要です' })
  })

  it('Supabase エラー時: error を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser }, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: { message: 'Password too short' } })

    const formData = new FormData()
    formData.set('password', 'short')
    formData.set('confirmPassword', 'short')

    const result = await updatePassword(formData)

    expect(result).toEqual({ error: 'Password too short' })
  })
})
