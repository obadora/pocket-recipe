'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function resetPassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?error=${encodeURIComponent('パスワードが一致しません')}`)
    return
  }

  if (password.length < 6) {
    redirect(`/auth/reset-password?error=${encodeURIComponent('パスワードは6文字以上で入力してください')}`)
    return
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/login?message=${encodeURIComponent('パスワードを変更しました。新しいパスワードでログインしてください。')}`)
}
