import type { ParsedRecipe } from '../types/recipe'

export async function parseRecipeFromImages(files: File[]): Promise<ParsedRecipe> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('images[]', file)
  }

  const res = await fetch('/api/recipes/parse', { method: 'POST', body: formData })

  if (!res.ok) {
    throw new Error('Failed to parse recipe')
  }

  return res.json()
}

export async function parseRecipeFromImage(file: File): Promise<ParsedRecipe> {
  return parseRecipeFromImages([file])
}
