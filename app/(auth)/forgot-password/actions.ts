'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function sendResetEmail(formData: FormData) {
  const email = (formData.get('email') as string).trim()

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('メールアドレスを入力してください')}`)
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/login?message=${encodeURIComponent('パスワードリセット用のメールを送信しました。メールをご確認ください。')}`)
}
