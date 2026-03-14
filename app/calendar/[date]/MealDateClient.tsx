'use client'

import { useState, useTransition, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createMealRecord, deleteMealRecord } from '../../meal-records/actions'

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  cookTime: number | null
  imageUrl: string | null
  categories: Array<{ category: { id: string; name: string } }>
}

type MealRecord = {
  id: string
  recipeId: string
  date: Date
  type: string
  mealTime: string | null
  recipe: { id: string; title: string }
}

type Props = {
  date: string
  recipes: Recipe[]
  mealRecords: MealRecord[]
}

type AddStep =
  | { phase: 'idle' }
  | { phase: 'selectType'; recipeId: string }
  | { phase: 'selectMealTime'; recipeId: string }

const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: '朝',
  lunch: '昼',
  dinner: '夜',
}

const MEAL_TIME_VALUES = [
  { key: 'breakfast', label: '朝' },
  { key: 'lunch', label: '昼' },
  { key: 'dinner', label: '夜' },
]

function getRecordLabel(type: string, mealTime: string | null): string {
  if (type === 'cooked') return '作った'
  if (mealTime && MEAL_TIME_LABELS[mealTime]) return `食べた / ${MEAL_TIME_LABELS[mealTime]}`
  return '食べた'
}

export default function MealDateClient({ date, recipes, mealRecords }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [addStep, setAddStep] = useState<AddStep>({ phase: 'idle' })

  const filtered = useMemo(() =>
    query.trim() === ''
      ? recipes
      : recipes.filter((r) => r.title.includes(query.trim())),
    [recipes, query]
  )

  const handleAddClick = (recipeId: string) => {
    setAddStep({ phase: 'selectType', recipeId })
  }

  const handleSelectType = (type: 'ate' | 'cooked') => {
    if (addStep.phase !== 'selectType') return
    const { recipeId } = addStep
    if (type === 'cooked') {
      startTransition(async () => {
        await createMealRecord({ recipeId, date, type: 'cooked', mealTime: null })
        router.refresh()
      })
      setAddStep({ phase: 'idle' })
    } else {
      setAddStep({ phase: 'selectMealTime', recipeId })
    }
  }

  const handleSelectMealTime = (mealTime: string) => {
    if (addStep.phase !== 'selectMealTime') return
    const { recipeId } = addStep
    startTransition(async () => {
      await createMealRecord({ recipeId, date, type: 'ate', mealTime })
      router.refresh()
    })
    setAddStep({ phase: 'idle' })
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
        <h2 className="text-sm font-medium text-zinc-500 mb-3">登録済み</h2>
        {mealRecords.length === 0 ? (
          <p className="text-sm text-zinc-400">まだ登録されていません</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mealRecords.map((r) => {
              const recipe = recipes.find((re) => re.id === r.recipeId)
              return (
                <li key={r.id} data-testid={`registered-${r.recipeId}`} className="relative group">
                  <Link
                    href={`/recipes/${r.recipeId}`}
                    className="flex flex-col bg-white rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors overflow-hidden h-full"
                  >
                    {recipe?.imageUrl ? (
                      <div className="relative aspect-square w-full">
                        <Image src={recipe.imageUrl} alt={r.recipe.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="font-medium text-zinc-900 text-sm leading-snug line-clamp-2">{r.recipe.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">{getRecordLabel(r.type, r.mealTime)}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label="削除"
                    disabled={isPending}
                    onClick={() => handleDelete(r.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-red-500 hover:text-red-700 text-xs shadow disabled:opacity-50 cursor-pointer"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* レシピを追加 */}
      <section>
        <h2 className="text-sm font-medium text-zinc-500 mb-3">レシピを追加</h2>
        <input
          type="text"
          placeholder="レシピを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-4 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <div className="flex gap-2 mb-4">
          <Link
            href={`/recipes/new?from=/calendar/${date}`}
            className="flex-1 text-center px-3 py-2 text-xs font-medium border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            手動で作成
          </Link>
          <Link
            href={`/recipes/new/from-url?from=/calendar/${date}`}
            className="flex-1 text-center px-3 py-2 text-xs font-medium border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            URLから作成
          </Link>
          <Link
            href={`/recipes/new/from-photo?from=/calendar/${date}`}
            className="flex-1 text-center px-3 py-2 text-xs font-medium border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            写真から作成
          </Link>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-400">該当するレシピがありません</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((recipe) => {
              const isSelected = addStep.phase !== 'idle' && addStep.recipeId === recipe.id
              return (
                <li key={recipe.id} className="relative">
                  <div className="flex flex-col bg-white rounded-xl border border-zinc-200 overflow-hidden h-full">
                    {recipe.imageUrl ? (
                      <div className="relative aspect-square w-full">
                        <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm text-zinc-700 leading-snug line-clamp-2 mb-2">{recipe.title}</p>

                      {!isSelected && (
                        <button
                          type="button"
                          aria-label="追加"
                          disabled={isPending}
                          onClick={() => handleAddClick(recipe.id)}
                          className="w-full px-2 py-1 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                        >
                          追加
                        </button>
                      )}

                      {isSelected && addStep.phase === 'selectType' && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleSelectType('ate')}
                            className="flex-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                          >
                            食べた
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectType('cooked')}
                            className="flex-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                          >
                            作った
                          </button>
                        </div>
                      )}

                      {isSelected && addStep.phase === 'selectMealTime' && (
                        <div className="flex gap-1">
                          {MEAL_TIME_VALUES.map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSelectMealTime(key)}
                              className="flex-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 cursor-pointer"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
