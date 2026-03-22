import Link from 'next/link'
import { sendResetEmail } from './actions'

type Props = {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, message } = await searchParams

  return (
    <>
      <h1 className="text-xl font-semibold text-zinc-900 mb-2">パスワードを忘れた方</h1>
      <p className="text-sm text-zinc-500 mb-6">
        登録済みのメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
      </p>

      {message && (
        <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <form action={sendResetEmail} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 active:bg-zinc-800 transition-colors"
        >
          リセットメールを送信
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-zinc-900 hover:underline">
          ログインに戻る
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-zinc-400">
        メールアドレスも忘れた場合はサポートにお問い合わせください。
      </p>
    </>
  )
}
