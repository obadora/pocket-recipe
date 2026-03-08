import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ParsedRecipe } from '../types/recipe'

const validRecipe: ParsedRecipe = {
  title: 'カレーライス',
  description: '定番カレー',
  servings: 4,
  cookTime: 30,
  ingredients: [{ name: '玉ねぎ', amount: '1', unit: '個' }],
  steps: ['玉ねぎを炒める'],
}

describe('parseRecipeFromUrl', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('成功時: ParsedRecipe を返す', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validRecipe),
    })

    const { parseRecipeFromUrl } = await import('./recipeUrlParser')
    const result = await parseRecipeFromUrl('https://example.com/recipe')

    expect(result).toEqual(validRecipe)
    expect(mockFetch).toHaveBeenCalledWith('/api/recipes/parse-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/recipe' }),
    })
  })

  it('res.ok が false の場合: error メッセージ付きで throw する', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'INVALID_URL' }),
    })

    const { parseRecipeFromUrl } = await import('./recipeUrlParser')

    await expect(parseRecipeFromUrl('ftp://bad')).rejects.toThrow('INVALID_URL')
  })

  it('JSON パース不可の場合: デフォルトメッセージで throw する', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    })

    const { parseRecipeFromUrl } = await import('./recipeUrlParser')

    await expect(parseRecipeFromUrl('https://example.com')).rejects.toThrow('Failed to parse recipe from URL')
  })
})
