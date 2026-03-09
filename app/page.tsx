import { signOut } from './(auth)/actions'
import { createClient } from './utils/supabase/server'
import { prisma } from '../lib/prisma'
import AddRecipeDropdown from './components/AddRecipeDropdown'
import HomeTabs from './components/HomeTabs'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [recipes, mealRecords] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        categories: { include: { category: true } },
      },
    }),
    prisma.mealRecord.findMany({
      where: { userId: user!.id },
      include: { recipe: { select: { id: true, title: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">ぽけっと レシピ</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-500">{recipes.length}件のレシピ</p>
          <AddRecipeDropdown />
        </div>

        <HomeTabs recipes={recipes} mealRecords={mealRecords} />
      </main>
    </div>
  )
}
