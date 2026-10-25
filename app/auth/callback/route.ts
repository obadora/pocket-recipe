import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../utils/supabase/server'
import { prisma } from '../../../lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error)
    }

    if (!error && data.user) {
      // Supabase AuthユーザーをPrisma DBに同期
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {},
        create: { id: data.user.id, email: data.user.email!, username: data.user.user_metadata?.username || null },
      })

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('認証に失敗しました')}`)
}
