'use client'
import { useTransition } from 'react'
import { deleteRecipe } from '../actions'

export default function DeleteButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!window.confirm('このレシピを削除してもよろしいですか？')) return
    startTransition(async () => {
      await deleteRecipe(recipeId)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? '削除中...' : 'レシピを削除'}
    </button>
  )
}
