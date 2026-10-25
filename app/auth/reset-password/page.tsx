import Link from 'next/link'
import { resetPassword } from './actions'

type Props = {
  searchParams: Promise<{ code?: string; error?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { code, error } = await searchParams

  // codeがない場合は無効なリンク
  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <h1 className="text-xl font-semibold text-zinc-900 mb-4">リンクが無効です</h1>
          <p className="text-sm text-zinc-500 mb-6">
            パスワードリセットリンクが無効か期限切れです。もう一度お試しください。
          </p>
          <Link
            href="/forgot-password"
            className="block w-full text-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            パスワードリセットをやり直す
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">新しいパスワードを設定</h1>
        <p className="text-sm text-zinc-500 mb-6">
          新しいパスワードを入力してください。
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <form action={resetPassword} className="flex flex-col gap-4">
          <input type="hidden" name="code" value={code} />

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              新しいパスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
              パスワード確認
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
          >
            パスワードを変更する
          </button>
        </form>
      </div>
    </div>
  )
}
