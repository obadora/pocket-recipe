'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Holidays from 'date-holidays'

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

type CalendarViewProps = {
  mealRecords: MealRecord[]
  recipes: Recipe[]
  initialMonth?: Date
}

type CellInfo = {
  dateKey: string   // YYYY-MM-DD
  day: number
  dayOfWeek: number // 0=Sun, 6=Sat
  isCurrentMonth: boolean
  holidayName: string | null
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const hd = new Holidays('JP')

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getHolidayName(dateKey: string): string | null {
  const result = hd.isHoliday(new Date(dateKey + 'T00:00:00'))
  if (!result) return null
  const holiday = Array.isArray(result) ? result[0] : result
  return holiday.name
}

function buildCells(year: number, month: number): CellInfo[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const cells: CellInfo[] = []

  const leadingCount = firstDay.getDay()
  for (let i = leadingCount - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      dayOfWeek: d.getDay(),
      isCurrentMonth: false,
      holidayName: null,
    })
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day)
    const dateKey = toDateKey(d)
    cells.push({
      dateKey,
      day,
      dayOfWeek: d.getDay(),
      isCurrentMonth: true,
      holidayName: getHolidayName(dateKey),
    })
  }

  const trailingCount = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= trailingCount; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({
      dateKey: toDateKey(d),
      day: i,
      dayOfWeek: d.getDay(),
      isCurrentMonth: false,
      holidayName: null,
    })
  }

  return cells
}

function getDayColor(dayOfWeek: number, holidayName: string | null, isCurrentMonth: boolean): string {
  if (!isCurrentMonth) return 'text-zinc-300'
  if (dayOfWeek === 0 || holidayName) return 'text-red-500'
  if (dayOfWeek === 6) return 'text-blue-500'
  return 'text-zinc-700'
}

export default function CalendarView({ mealRecords, recipes: _recipes, initialMonth }: CalendarViewProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const base = initialMonth ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const cells = useMemo(() => buildCells(year, month), [year, month])

  const recordsByDate = useMemo(() => {
    const map: Record<string, MealRecord[]> = {}
    for (const record of mealRecords) {
      const key = toDateKey(new Date(record.date))
      if (!map[key]) map[key] = []
      map[key].push(record)
    }
    return map
  }, [mealRecords])

  const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          aria-label="前月"
          onClick={goToPrevMonth}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          前月
        </button>
        <span className="font-semibold text-zinc-900">
          {year}年{month + 1}月
        </span>
        <button
          type="button"
          aria-label="翌月"
          onClick={goToNextMonth}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          翌月
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            data-testid={`day-header-${i}`}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-zinc-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 auto-rows-fr gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden flex-1">
        {cells.map((cell) => {
          const dayRecords = cell.isCurrentMonth ? (recordsByDate[cell.dateKey] ?? []) : []
          const dayColor = getDayColor(cell.dayOfWeek, cell.holidayName, cell.isCurrentMonth)

          return (
            <button
              key={cell.dateKey}
              type="button"
              data-testid={`cell-${cell.dateKey}`}
              onClick={() => router.push(`/calendar/${cell.dateKey}`)}
              className="bg-white p-1 flex flex-col items-center transition-colors hover:bg-zinc-50 cursor-pointer"
            >
              <span className={`text-xs mb-0.5 ${dayColor}`}>{cell.day}</span>
              {cell.holidayName && (
                <span className="text-red-400 leading-tight mb-0.5" style={{ fontSize: '9px' }}>
                  {cell.holidayName}
                </span>
              )}
              {dayRecords.map((r) => (
                <span key={r.id} className="w-full block text-xs bg-zinc-100 text-zinc-700 rounded px-1 truncate mb-0.5">
                  {r.recipe.title}
                </span>
              ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
