'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import RecipeList from './RecipeList'
import WeekView from './WeekView'
import { signOut } from '../(auth)/actions'
import AddRecipeDropdown from './AddRecipeDropdown'

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  cookTime: number | null
  images: Array<{ url: string; isMain: boolean; order: number }>
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

type HomeTabsProps = {
  recipes: Recipe[]
  mealRecords: MealRecord[]
  user: { email: string | undefined }
  recipeCount: number
}

type Tab = 'list' | 'calendar' | 'account'

export default function HomeTabs({ recipes, mealRecords, user, recipeCount }: HomeTabsProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'calendar' ? 'calendar' : 'list'
  )

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <main className={activeTab === 'list'
        ? 'max-w-7xl w-full mx-auto px-4 py-8 flex-1 flex flex-col pb-20'
        : 'flex-1 flex flex-col px-2 pt-4 pb-20 min-h-0'
      }>
        {activeTab === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-zinc-500">{recipeCount}件のレシピ</p>
              <AddRecipeDropdown />
            </div>
            <RecipeList recipes={recipes} />
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <WeekView mealRecords={mealRecords} recipes={recipes} />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="max-w-7xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
            <h2 className="text-lg font-semibold text-zinc-900">アカウント</h2>
            <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
              <div className="px-4 py-3">
                <p className="text-xs text-zinc-400 mb-0.5">メールアドレス</p>
                <p className="text-sm text-zinc-700">{user.email}</p>
              </div>
              <div className="px-4 py-3">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:text-red-800 active:text-red-900 transition-colors cursor-pointer"
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 flex justify-center py-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          {([
            { key: 'list', label: 'リスト' },
            { key: 'calendar', label: 'カレンダー' },
            { key: 'account', label: 'アカウント' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${activeTab === key ? 'bg-zinc-900 text-white active:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
