import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockGetUser, mockGenerateContent } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockGenerateContent = vi.fn()
  return { mockGetUser, mockGenerateContent }
})


vi.mock('../../../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}))

const { mockGetGenerativeModel } = vi.hoisted(() => ({
  mockGetGenerativeModel: vi.fn(),
}))

vi.mock('@google/generative-ai', () => {
  function GoogleGenerativeAI() {
    return {
      getGenerativeModel: mockGetGenerativeModel,
    }
  }
  return { GoogleGenerativeAI }
})

import { POST } from './route'

function makeRequest(file?: File) {
  const formData = new FormData()
  if (file) formData.append('image', file)
  return new Request('http://localhost/api/recipes/parse', {
    method: 'POST',
    body: formData,
  })
}

const validParsedRecipe: ParsedRecipe = {
  title: 'カレーライス',
  description: '定番カレー',
  servings: 4,
  cookTime: 30,
  ingredients: [{ name: '玉ねぎ', amount: '1', unit: '個' }],
  steps: ['玉ねぎを炒める', 'カレールーを加える'],
}

describe('POST /api/recipes/parse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent })
  })

  it('GEMINI_MODEL 環境変数のモデルが使われる', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite-preview'
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    await POST(makeRequest(file) as unknown as Request)

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-3.1-flash-lite-preview' })
  })

  it('未認証の場合は 401 を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file) as unknown as Request)

    expect(res.status).toBe(401)
  })

  it('image フィールドがない場合は 400 を返す', async () => {
    const res = await POST(makeRequest() as unknown as Request)

    expect(res.status).toBe(400)
  })

  it('Gemini が正しい JSON を返す場合は 200 + ParsedRecipe を返す', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(validParsedRecipe)
  })

  it('Gemini が部分的な JSON (一部 null) を返す場合は 200 で null フィールドあり', async () => {
    const partial: ParsedRecipe = {
      title: null,
      description: null,
      servings: null,
      cookTime: null,
      ingredients: [],
      steps: [],
    }
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(partial) },
    })

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.title).toBeNull()
    expect(body.servings).toBeNull()
  })

  it('Gemini が invalid JSON を返す場合は 500 を返す', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'これはJSONではない' },
    })

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file) as unknown as Request)

    expect(res.status).toBe(500)
  })

  it('Gemini API が例外を投げる場合は 500 を返す', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const file = new File(['dummy'], 'recipe.jpg', { type: 'image/jpeg' })
    const res = await POST(makeRequest(file) as unknown as Request)

    expect(res.status).toBe(500)
  })
})
