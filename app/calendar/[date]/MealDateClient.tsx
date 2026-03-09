'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createMealRecord, deleteMealRecord } from '../../meal-records/actions'

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  cookTime: number | null
  categories: Array<{ category: { id: string; name: string } }>
}

type MealRecord = {
  id: string
  recipeId: string
  date: Date
  recipe: { id: string; title: string }
}

type Props = {
  date: string
  recipes: Recipe[]
  mealRecords: MealRecord[]
}

export default function MealDateClient({ date, recipes, mealRecords }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() =>
    query.trim() === ''
      ? recipes
      : recipes.filter((r) => r.title.includes(query.trim())),
    [recipes, query]
  )

  const handleAdd = (recipeId: string) => {
    startTransition(async () => {
      await createMealRecord({ recipeId, date })
      router.refresh()
    })
  }

  const handleDelete = (mealRecordId: string) => {
    startTransition(async () => {
      await deleteMealRecord(mealRecordId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* 登録済みレシピ */}
      <section>
        <h2 className="text-sm font-medium text-zinc-500 mb-2">登録済み</h2>
        {mealRecords.length === 0 ? (
          <p className="text-sm text-zinc-400">まだ登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {mealRecords.map((r) => (
              <li key={r.id} data-testid={`registered-${r.recipeId}`} className="flex items-center justify-between bg-white rounded-lg border border-zinc-200 px-4 py-3">
                <Link
                  href={`/recipes/${r.recipeId}`}
                  className="text-sm font-medium text-zinc-900 hover:underline"
                >
                  {r.recipe.title}
                </Link>
                <button
                  type="button"
                  aria-label="削除"
                  disabled={isPending}
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* レシピを追加 */}
      <section>
        <h2 className="text-sm font-medium text-zinc-500 mb-2">レシピを追加</h2>
        <input
          type="text"
          placeholder="レシピを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-3 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-400">該当するレシピがありません</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((recipe) => (
              <li key={recipe.id} className="flex items-center justify-between bg-white rounded-lg border border-zinc-200 px-4 py-3">
                <span className="text-sm text-zinc-700">{recipe.title}</span>
                <button
                  type="button"
                  aria-label="追加"
                  disabled={isPending}
                  onClick={() => handleAdd(recipe.id)}
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                >
                  追加
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
