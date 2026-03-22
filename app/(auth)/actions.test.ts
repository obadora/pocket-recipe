import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock はファイル先頭に巻き上げられるため、vi.hoisted() で変数を事前に定義する
const { mockSignUp, mockSignInWithPassword, mockSignInWithOAuth, mockSignOut, mockUpsert, mockRedirect } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockUpsert: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  }),
}))

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { upsert: mockUpsert },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { signUp, signIn, signInWithGoogle, signOut } from './actions'

describe('signUp', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: Prisma upsert を呼ばず、確認メールメッセージ付きの /login にリダイレクトする', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    })

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'password123')

    await signUp(formData)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?message=')
    )
  })

  it('username を Supabase メタデータに渡す', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    })

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'password123')
    formData.set('username', 'yamada_taro')

    await signUp(formData)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: { data: { username: 'yamada_taro' } },
    })
  })

  it('失敗時: /signup?error=... にリダイレクトする', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'password123')

    await signUp(formData)

    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/signup?error=')
    )
  })
})

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: Prisma upsert を呼び、/ にリダイレクトする', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com', user_metadata: { username: 'yamada_taro' } } },
      error: null,
    })
    mockUpsert.mockResolvedValue({})

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'password123')

    await signIn(formData)

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {},
      create: { id: 'user-123', email: 'test@example.com', username: 'yamada_taro' },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('失敗時: /login?error=... にリダイレクトする', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    })

    const formData = new FormData()
    formData.set('email', 'test@example.com')
    formData.set('password', 'wrongpassword')

    await signIn(formData)

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?error=')
    )
  })
})

describe('signInWithGoogle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('成功時: OAuthのURLにリダイレクトする', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/...' },
      error: null,
    })

    await signInWithGoogle()

    expect(mockRedirect).toHaveBeenCalledWith('https://accounts.google.com/oauth/...')
  })

  it('失敗時: /login?error=... にリダイレクトする', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth error' },
    })

    await signInWithGoogle()

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?error=')
    )
  })
})

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('/login にリダイレクトする', async () => {
    mockSignOut.mockResolvedValue({})

    await signOut()

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})
