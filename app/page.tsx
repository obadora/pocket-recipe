import Link from 'next/link'
import { signOut } from './(auth)/actions'
import { createClient } from './utils/supabase/server'
import { prisma } from '../lib/prisma'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const recipes = await prisma.recipe.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: 'desc' },
    include: {
      categories: { include: { category: true } },
    },
  })

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
          <Link
            href="/recipes/new"
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            + レシピを追加
          </Link>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 mb-4">レシピがまだありません。</p>
            <Link href="/recipes/new" className="text-sm font-medium text-zinc-900 underline underline-offset-2">
              最初のレシピを登録する
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="block bg-white rounded-xl border border-zinc-200 px-5 py-4 hover:border-zinc-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{recipe.title}</p>
                      {recipe.description && (
                        <p className="text-sm text-zinc-500 truncate mt-0.5">{recipe.description}</p>
                      )}
                      {recipe.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {recipe.categories.map(({ category }) => (
                            <span key={category.id} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-zinc-400 space-y-1 text-right">
                      {recipe.servings && <p>{recipe.servings}人前</p>}
                      {recipe.cookTime && <p>{recipe.cookTime}分</p>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
