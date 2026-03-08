import type { ParsedRecipe } from '../types/recipe'

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const res = await fetch('/api/recipes/parse-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Failed to parse recipe from URL')
  }
  return res.json()
}
