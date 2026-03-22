import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseRecipeFromImages, parseRecipeFromImage } from './recipeParser'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))
vi.stubGlobal('fetch', mockFetch)

const mockParsedRecipe = {
  title: 'テストレシピ',
  description: 'テスト説明',
  servings: 2,
  cookTime: 30,
  ingredients: [{ name: '材料1', amount: '100', unit: 'g' }],
  steps: ['手順1', '手順2'],
  imageUrl: null,
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('parseRecipeFromImages', () => {
  it('sends POST with images[] FormData entries for each file', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockParsedRecipe })

    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })

    await parseRecipeFromImages([file1, file2])

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/recipes/parse')
    expect(options.method).toBe('POST')

    const body = options.body as FormData
    const entries = body.getAll('images[]')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toBe(file1)
    expect(entries[1]).toBe(file2)
  })

  it('returns ParsedRecipe on 200', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockParsedRecipe })

    const file = new File(['a'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await parseRecipeFromImages([file])

    expect(result).toEqual(mockParsedRecipe)
  })

  it('throws on non-200 response', async () => {
    mockFetch.mockResolvedValue({ ok: false })

    const file = new File(['a'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(parseRecipeFromImages([file])).rejects.toThrow('Failed to parse recipe')
  })
})

describe('parseRecipeFromImage (wrapper)', () => {
  it('calls parseRecipeFromImages with a single-element array', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockParsedRecipe })

    const file = new File(['a'], 'photo.jpg', { type: 'image/jpeg' })
    await parseRecipeFromImage(file)

    const body = mockFetch.mock.calls[0][1].body as FormData
    const entries = body.getAll('images[]')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toBe(file)
  })
})
