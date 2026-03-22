import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockUpdateUsername, mockUpdateEmail, mockUpdatePassword, mockSignOut } = vi.hoisted(() => ({
  mockUpdateUsername: vi.fn(),
  mockUpdateEmail: vi.fn(),
  mockUpdatePassword: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('../account/actions', () => ({
  updateUsername: mockUpdateUsername,
  updateEmail: mockUpdateEmail,
  updatePassword: mockUpdatePassword,
}))

vi.mock('../(auth)/actions', () => ({ signOut: mockSignOut }))

import AccountTab from './AccountTab'

const defaultUser = { email: 'test@example.com', username: 'yamada_taro' }

describe('AccountTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ユーザー名とメールアドレスが表示される', () => {
    render(<AccountTab user={defaultUser} />)
    expect(screen.getByText('yamada_taro')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('ユーザー名が未設定の場合「未設定」と表示される', () => {
    render(<AccountTab user={{ ...defaultUser, username: null }} />)
    expect(screen.getByText('未設定')).toBeInTheDocument()
  })

  it('ログアウトボタンが表示される', () => {
    render(<AccountTab user={defaultUser} />)
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
  })

  it('ユーザー名の「編集」ボタンをクリックするとフォームが表示される', async () => {
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'ユーザー名を編集' }))

    expect(screen.getByRole('textbox', { name: 'ユーザー名入力' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
  })

  it('ユーザー名フォームでキャンセルをクリックするとフォームが閉じる', async () => {
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'ユーザー名を編集' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('textbox', { name: 'ユーザー名入力' })).not.toBeInTheDocument()
  })

  it('ユーザー名フォームを送信すると updateUsername が呼ばれる', async () => {
    mockUpdateUsername.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'ユーザー名を編集' }))
    const input = screen.getByRole('textbox', { name: 'ユーザー名入力' })
    await user.clear(input)
    await user.type(input, 'new_name')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockUpdateUsername).toHaveBeenCalled()
    })
  })

  it('updateUsername 成功時に成功メッセージが表示される', async () => {
    mockUpdateUsername.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'ユーザー名を編集' }))
    const input = screen.getByRole('textbox', { name: 'ユーザー名入力' })
    await user.clear(input)
    await user.type(input, 'new_name')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('ユーザー名を更新しました')).toBeInTheDocument()
    })
  })

  it('updateUsername エラー時にエラーメッセージが表示される', async () => {
    mockUpdateUsername.mockResolvedValue({ error: 'ユーザー名を入力してください' })
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'ユーザー名を編集' }))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument()
    })
  })

  it('メールアドレスの「編集」ボタンをクリックするとフォームが表示される', async () => {
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'メールアドレスを編集' }))

    expect(screen.getByRole('textbox', { name: 'メールアドレス入力' })).toBeInTheDocument()
  })

  it('updateEmail 成功時に確認メッセージが表示される', async () => {
    mockUpdateEmail.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'メールアドレスを編集' }))
    await user.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => {
      expect(screen.getByText('確認メールを送信しました')).toBeInTheDocument()
    })
  })

  it('パスワード「変更」ボタンをクリックするとフォームが表示される', async () => {
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'パスワードを変更' }))

    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument()
  })

  it('updatePassword 成功時に成功メッセージが表示される', async () => {
    mockUpdatePassword.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<AccountTab user={defaultUser} />)

    await user.click(screen.getByRole('button', { name: 'パスワードを変更' }))
    await user.type(screen.getByLabelText('新しいパスワード'), 'newpassword123')
    await user.type(screen.getByLabelText('パスワード確認'), 'newpassword123')
    await user.click(screen.getByRole('button', { name: 'パスワードを変更する' }))

    await waitFor(() => {
      expect(screen.getByText('パスワードを変更しました')).toBeInTheDocument()
    })
  })
})
