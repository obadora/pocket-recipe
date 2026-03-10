'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import RecipeList from './RecipeList'
import CalendarView from './CalendarView'

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
  recipe: { id: string; title: string }
}

type HomeTabsProps = {
  recipes: Recipe[]
  mealRecords: MealRecord[]
}

type Tab = 'list' | 'calendar'

export default function HomeTabs({ recipes, mealRecords }: HomeTabsProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'calendar' ? 'calendar' : 'list'
  )

  return (
    <div className={`flex flex-col ${activeTab === 'calendar' ? 'flex-1 min-h-0' : ''}`}>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'list'
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          リスト
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          カレンダー
        </button>
      </div>

      {activeTab === 'list' ? (
        <RecipeList recipes={recipes} />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden"><CalendarView mealRecords={mealRecords} recipes={recipes} /></div>
      )}
    </div>
  )
}
