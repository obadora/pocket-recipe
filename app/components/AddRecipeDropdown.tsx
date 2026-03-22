'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export default function AddRecipeDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 active:bg-zinc-800 transition-colors flex items-center gap-1"
      >
        + レシピを追加
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white border border-zinc-200 shadow-lg z-10 overflow-hidden">
          <Link
            href="/recipes/new"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            手動で作成
          </Link>
          <Link
            href="/recipes/new/from-photo"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
          >
            写真から作成
          </Link>
          <Link
            href="/recipes/new/from-url"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
          >
            URLから作成
          </Link>
        </div>
      )}
    </div>
  )
}
