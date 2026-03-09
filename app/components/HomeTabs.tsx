'use client'

import { useState } from 'react'
import RecipeList from './RecipeList'
import CalendarView from './CalendarView'

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

type HomeTabsProps = {
  recipes: Recipe[]
  mealRecords: MealRecord[]
}

type Tab = 'list' | 'calendar'

export default function HomeTabs({ recipes, mealRecords }: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('list')

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
        <CalendarView mealRecords={mealRecords} recipes={recipes} />
      )}
    </div>
  )
}
