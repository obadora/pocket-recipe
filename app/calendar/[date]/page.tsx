import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/server'
import { prisma } from '../../../lib/prisma'
import MealDateClient from './MealDateClient'

type Props = {
  params: Promise<{ date: string }>
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日（${dayNames[d.getDay()]}）`
}

export default async function CalendarDatePage({ params }: Props) {
  const { date } = await params

  // YYYY-MM-DD 形式バリデーション
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [recipes, mealRecords] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        servings: true,
        cookTime: true,
        imageUrl: true,
        categories: { include: { category: true } },
      },
    }),
    prisma.mealRecord.findMany({
      where: {
        userId: user!.id,
        date: new Date(date),
      },
      include: { recipe: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/?tab=calendar" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            ← カレンダーへ
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900">{formatDateLabel(date)}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <MealDateClient date={date} recipes={recipes} mealRecords={mealRecords} />
      </main>
    </div>
  )
}
