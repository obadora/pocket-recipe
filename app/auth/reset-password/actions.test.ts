import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExchangeCodeForSession, mockUpdateUser, mockRedirect } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('../../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      updateUser: mockUpdateUser,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { resetPassword } from './actions'

describe('resetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: supabase.auth.updateUser を呼び /login?message=... にリダイレクトする', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'newpassword123')

    await resetPassword(formData)

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' })
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?message=')
    )
  })

  it('パスワード不一致時: /auth/reset-password?error=... にリダイレクトする', async () => {
    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'different123')

    await resetPassword(formData)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password?error=')
    )
  })

  it('パスワードが短い場合: /auth/reset-password?error=... にリダイレクトする', async () => {
    const formData = new FormData()
    formData.set('password', 'abc')
    formData.set('confirmPassword', 'abc')

    await resetPassword(formData)

    expect(mockUpdateUser).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password?error=')
    )
  })

  it('Supabase エラー時: /auth/reset-password?error=... にリダイレクトする', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: { message: 'Password too weak' } })

    const formData = new FormData()
    formData.set('password', 'newpassword123')
    formData.set('confirmPassword', 'newpassword123')

    await resetPassword(formData)

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password?error=')
    )
  })
})
