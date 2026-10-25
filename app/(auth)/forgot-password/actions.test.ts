import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResetPasswordForEmail, mockRedirect } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('../../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { sendResetEmail } from './actions'

describe('sendResetEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: /login?message=... にリダイレクトする', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.set('email', 'test@example.com')

    await sendResetEmail(formData)

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') })
    )
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?message=')
    )
  })

  it('Supabase エラー時: /forgot-password?error=... にリダイレクトする', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } })

    const formData = new FormData()
    formData.set('email', 'notfound@example.com')

    await sendResetEmail(formData)

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/forgot-password?error=')
    )
  })

  it('メールアドレスが空の場合: /forgot-password?error=... にリダイレクトする', async () => {
    const formData = new FormData()
    formData.set('email', '')

    await sendResetEmail(formData)

    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/forgot-password?error=')
    )
  })
})
