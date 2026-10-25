'use server'

import { createClient } from '../utils/supabase/server'
import { prisma } from '../../lib/prisma'

export async function updateUsername(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const username = (formData.get('username') as string).trim()

  if (!username) {
    return { error: 'ユーザー名を入力してください' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { username },
  })

  return { success: true }
}

export async function updateEmail(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const email = formData.get('email') as string

  const { error } = await supabase.auth.updateUser({ email })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'パスワードが一致しません' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
