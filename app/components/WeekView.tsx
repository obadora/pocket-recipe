'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Recipe = {
  id: string
  title: string
}

type MealRecord = {
  id: string
  recipeId: string
  date: Date
  type: string
  mealTime: string | null
  recipe: { id: string; title: string }
}

type WeekViewProps = {
  mealRecords: MealRecord[]
  recipes: Recipe[]
  initialDate?: Date
}

type Filter = 'all' | 'ate' | 'cooked'

const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: '朝',
  lunch: '昼',
  dinner: '夜',
}

const MEAL_TIME_ORDER = ['breakfast', 'lunch', 'dinner']

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // 月曜始まり (0=日 → -6, 1=月 → 0, ..., 6=土 → -5)
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function buildWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']

export default function WeekView({ mealRecords, initialDate }: WeekViewProps) {
  const router = useRouter()
  const [weekMonday, setWeekMonday] = useState(() => getWeekMonday(initialDate ?? new Date()))
  const [filter, setFilter] = useState<Filter>('all')

  const days = useMemo(() => buildWeekDays(weekMonday), [weekMonday])

  const recordsByDate = useMemo(() => {
    const map: Record<string, MealRecord[]> = {}
    for (const record of mealRecords) {
      const key = toDateKey(new Date(record.date))
      if (!map[key]) map[key] = []
      map[key].push(record)
    }
    return map
  }, [mealRecords])

  const goToPrevWeek = () => {
    const d = new Date(weekMonday)
    d.setDate(d.getDate() - 7)
    setWeekMonday(d)
  }

  const goToNextWeek = () => {
    const d = new Date(weekMonday)
    d.setDate(d.getDate() + 7)
    setWeekMonday(d)
  }

  const weekEnd = days[6]
  const rangeLabel = `${weekMonday.getMonth() + 1}月${weekMonday.getDate()}日〜${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 週ナビゲーション */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="前週"
          onClick={goToPrevWeek}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          前週
        </button>
        <span className="text-sm font-semibold text-zinc-900">{rangeLabel}</span>
        <button
          type="button"
          aria-label="翌週"
          onClick={goToNextWeek}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 transition-colors cursor-pointer"
        >
          翌週
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {(['all', 'ate', 'cooked'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              filter === f ? 'bg-zinc-900 text-white active:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300'
            }`}
          >
            {f === 'all' ? 'すべて' : f === 'ate' ? '食べた' : '作った'}
          </button>
        ))}
      </div>

      {/* 日付リスト */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {days.map((day, i) => {
          const dateKey = toDateKey(day)
          const allRecords = recordsByDate[dateKey] ?? []
          const ateRecords = allRecords.filter((r) => r.type === 'ate')
          const cookedRecords = allRecords.filter((r) => r.type === 'cooked')

          const showAte = filter !== 'cooked'
          const showCooked = filter !== 'ate'

          const isToday = toDateKey(new Date()) === dateKey
          const isSunday = i === 6
          const isSaturday = i === 5

          return (
            <button
              key={dateKey}
              type="button"
              data-testid={`day-row-${dateKey}`}
              onClick={() => router.push(`/calendar/${dateKey}`)}
              className={`w-full text-left rounded-xl border px-3 py-2 transition-colors cursor-pointer hover:bg-zinc-50 active:bg-zinc-100 ${
                isToday ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 日付 */}
                <div className="flex-shrink-0 w-10 pt-0.5">
                  <span className={`text-xs font-medium ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-zinc-500'}`}>
                    {DAY_LABELS[i]}
                  </span>
                  <p className={`text-sm font-semibold leading-tight ${isToday ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {day.getMonth() + 1}/{day.getDate()}
                  </p>
                </div>

                {/* 記録 */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  {/* 食べた: 時間帯グルーピング */}
                  {showAte && MEAL_TIME_ORDER.map((mt) => {
                    const recs = ateRecords.filter((r) => r.mealTime === mt)
                    if (recs.length === 0) return null
                    return (
                      <div key={mt} className="flex items-start gap-1.5">
                        <span className="flex-shrink-0 text-xs text-zinc-400 w-4 pt-0.5">{MEAL_TIME_LABELS[mt]}</span>
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {recs.map((r) => (
                            <span key={r.id} className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 truncate max-w-full">
                              {r.recipe.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* 食べたが mealTime=null のもの */}
                  {showAte && (() => {
                    const recs = ateRecords.filter((r) => r.mealTime === null)
                    if (recs.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1">
                        {recs.map((r) => (
                          <span key={r.id} className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 truncate max-w-full">
                            {r.recipe.title}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {/* 作った */}
                  {showCooked && cookedRecords.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <span className="flex-shrink-0 text-xs text-zinc-400 w-4 pt-0.5">作</span>
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {cookedRecords.map((r) => (
                          <span key={r.id} className="text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5 truncate max-w-full">
                            {r.recipe.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 記録なし */}
                  {allRecords.length === 0 && (
                    <span className="text-xs text-zinc-300">記録なし</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
