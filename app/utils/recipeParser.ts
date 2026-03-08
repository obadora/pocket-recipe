import type { ParsedRecipe } from '../types/recipe'

export async function parseRecipeFromImage(file: File): Promise<ParsedRecipe> {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch('/api/recipes/parse', { method: 'POST', body: formData })

  if (!res.ok) {
    throw new Error('Failed to parse recipe')
  }

  return res.json()
}
