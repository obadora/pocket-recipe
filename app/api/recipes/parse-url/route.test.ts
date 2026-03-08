import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockGetUser, mockGenerateContent, mockPuppeteerLaunch } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockGenerateContent = vi.fn()
  const mockPuppeteerLaunch = vi.fn()
  return { mockGetUser, mockGenerateContent, mockPuppeteerLaunch }
})

vi.mock('puppeteer', () => ({
  default: { launch: mockPuppeteerLaunch },
}))

vi.mock('@google/generative-ai', () => {
  function GoogleGenerativeAI() {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }
  }
  return { GoogleGenerativeAI }
})

vi.mock('../../../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}))

import { POST } from './route'

function makeRequest(body?: object) {
  return new Request('http://localhost/api/recipes/parse-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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

describe('POST /api/recipes/parse-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
  })

  it('未認証の場合は 401 を返す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(401)
  })

  it('url がない場合は 400 を返す', async () => {
    const res = await POST(makeRequest({}) as unknown as Request)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing url')
  })

  it('不正な URL の場合は 400 を返す', async () => {
    const res = await POST(makeRequest({ url: 'not-a-url' }) as unknown as Request)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('INVALID_URL')
  })

  it('http/https 以外のプロトコルの場合は 400 を返す', async () => {
    const res = await POST(makeRequest({ url: 'ftp://example.com' }) as unknown as Request)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('INVALID_URL')
  })

  it('ページ取得失敗の場合は 422 を返し、browser.close が呼ばれる', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
      evaluate: vi.fn(),
      screenshot: vi.fn(),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(422)
    expect(mockClose).toHaveBeenCalled()
  })

  it('テキスト抽出成功時: Gemini テキストプロンプトで呼ばれ 200 + ParsedRecipe を返す', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('玉ねぎを炒めてカレーを作る材料: 玉ねぎ1個'),
      screenshot: vi.fn(),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(validParsedRecipe)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('玉ねぎを炒めてカレーを作る材料')])
    )
  })

  it('テキストが 0 文字の場合: スクリーンショットで Gemini 画像入力、200 + ParsedRecipe を返す', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const screenshotBuffer = Buffer.from('fake-png-data')
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(''),
      screenshot: vi.fn().mockResolvedValue(screenshotBuffer),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(validParsedRecipe)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ inlineData: expect.objectContaining({ mimeType: 'image/png' }) })])
    )
  })

  it('Gemini が invalid JSON を返す場合は 500 を返す', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('some text'),
      screenshot: vi.fn(),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'これはJSONではない' },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(500)
  })

  it('Gemini API が例外を投げる場合は 500 を返す', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('some text'),
      screenshot: vi.fn(),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(500)
  })

  it('エラー時も browser.close が呼ばれる (finally)', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    const mockPage2 = {
      setDefaultNavigationTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue('some text'),
      screenshot: vi.fn(),
    }
    mockPuppeteerLaunch.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue(mockPage2),
      close: mockClose,
    })
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(mockClose).toHaveBeenCalled()
  })
})
