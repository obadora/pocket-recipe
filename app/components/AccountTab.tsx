'use client'

import { useState } from 'react'
import { signOut } from '../(auth)/actions'
import { updateUsername, updateEmail, updatePassword } from '../account/actions'

type AccountTabProps = {
  user: {
    email: string | undefined
    username: string | null | undefined
  }
}

export default function AccountTab({ user }: AccountTabProps) {
  const [editingField, setEditingField] = useState<'username' | 'email' | 'password' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; field: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleUsernameSubmit = async (formData: FormData) => {
    setMessage(null)
    setIsPending(true)
    const result = await updateUsername(formData)
    setIsPending(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error, field: 'username' })
    } else {
      setMessage({ type: 'success', text: 'ユーザー名を更新しました', field: 'username' })
      setEditingField(null)
    }
  }

  const handleEmailSubmit = async (formData: FormData) => {
    setMessage(null)
    setIsPending(true)
    const result = await updateEmail(formData)
    setIsPending(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error, field: 'email' })
    } else {
      setMessage({ type: 'success', text: '確認メールを送信しました', field: 'email' })
      // フォームは開いたままにしてメッセージを表示（確認メール送信のため）
    }
  }

  const handlePasswordSubmit = async (formData: FormData) => {
    setMessage(null)
    setIsPending(true)
    const result = await updatePassword(formData)
    setIsPending(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error, field: 'password' })
    } else {
      setMessage({ type: 'success', text: 'パスワードを変更しました', field: 'password' })
      setEditingField(null)
    }
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-zinc-900">アカウント</h2>
      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">

        {/* ユーザー名 */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-zinc-400">ユーザー名</p>
            {editingField !== 'username' && (
              <button
                type="button"
                aria-label="ユーザー名を編集"
                onClick={() => { setEditingField('username'); setMessage(null) }}
                className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                編集
              </button>
            )}
          </div>
          {editingField === 'username' ? (
            <form action={handleUsernameSubmit} className="flex flex-col gap-2 mt-1">
              <input
                name="username"
                type="text"
                aria-label="ユーザー名入力"
                defaultValue={user.username ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                disabled={isPending}
              />
              {message?.field === 'username' && (
                <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message.text}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                >
                  保存
                </button>
                <button
                  type="button"
                  aria-label="キャンセル"
                  onClick={() => { setEditingField(null); setMessage(null) }}
                  className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-zinc-700">{user.username ?? '未設定'}</p>
              {message?.field === 'username' && message.type === 'success' && (
                <p className="text-xs text-green-600 mt-1">{message.text}</p>
              )}
            </>
          )}
        </div>

        {/* メールアドレス */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-zinc-400">メールアドレス</p>
            {editingField !== 'email' && (
              <button
                type="button"
                aria-label="メールアドレスを編集"
                onClick={() => { setEditingField('email'); setMessage(null) }}
                className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                編集
              </button>
            )}
          </div>
          {editingField === 'email' ? (
            <form action={handleEmailSubmit} className="flex flex-col gap-2 mt-1">
              <input
                name="email"
                type="email"
                aria-label="メールアドレス入力"
                defaultValue={user.email ?? ''}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                disabled={isPending}
              />
              {message?.field === 'email' && (
                <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message.text}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                >
                  送信
                </button>
                <button
                  type="button"
                  aria-label="キャンセル"
                  onClick={() => { setEditingField(null); setMessage(null) }}
                  className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-sm text-zinc-700">{user.email}</p>
            </>
          )}
          {message?.field === 'email' && message.type === 'success' && editingField !== 'email' && (
            <p className="text-xs text-green-600 mt-1">{message.text}</p>
          )}
        </div>

        {/* パスワード */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-zinc-400">パスワード</p>
            {editingField !== 'password' && (
              <button
                type="button"
                aria-label="パスワードを変更"
                onClick={() => { setEditingField('password'); setMessage(null) }}
                className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                変更
              </button>
            )}
          </div>
          {editingField === 'password' ? (
            <form action={handlePasswordSubmit} className="flex flex-col gap-2 mt-1">
              <div className="flex flex-col gap-1">
                <label htmlFor="new-password" className="text-xs text-zinc-500">新しいパスワード</label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="confirm-password" className="text-xs text-zinc-500">パスワード確認</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                  disabled={isPending}
                />
              </div>
              {message?.field === 'password' && (
                <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message.text}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                >
                  パスワードを変更する
                </button>
                <button
                  type="button"
                  aria-label="キャンセル"
                  onClick={() => { setEditingField(null); setMessage(null) }}
                  className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-zinc-400">••••••••</p>
          )}
          {message?.field === 'password' && message.type === 'success' && editingField !== 'password' && (
            <p className="text-xs text-green-600 mt-1">{message.text}</p>
          )}
        </div>

        {/* ログアウト */}
        <div className="px-4 py-3">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-800 active:text-red-900 transition-colors cursor-pointer"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
