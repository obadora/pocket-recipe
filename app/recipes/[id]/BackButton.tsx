'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm text-zinc-500 hover:text-zinc-900 active:text-zinc-700 transition-colors cursor-pointer"
    >
      ← 戻る
    </button>
  )
}
