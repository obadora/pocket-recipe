import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedRecipe } from '../../../types/recipe'

const { mockGetUser, mockGenerateContent, mockPuppeteerLaunch, mockFetch } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockGenerateContent = vi.fn()
  const mockPuppeteerLaunch = vi.fn()
  const mockFetch = vi.fn()
  return { mockGetUser, mockGenerateContent, mockPuppeteerLaunch, mockFetch }
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
  imageUrl: null,
}

function makeMockPage(overrides: Partial<{
  goto: ReturnType<typeof vi.fn>
  evaluate: ReturnType<typeof vi.fn>
  screenshot: ReturnType<typeof vi.fn>
  imageUrl: string | null
}> = {}) {
  const { imageUrl = null, ...rest } = overrides
  const evaluateMock = vi.fn()
    .mockResolvedValueOnce('a'.repeat(200)) // テキスト取得
    .mockResolvedValueOnce(imageUrl)        // 画像URL取得
  return {
    setDefaultNavigationTimeout: vi.fn(),
    setRequestInterception: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: rest.evaluate ?? evaluateMock,
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
    setViewport: vi.fn().mockResolvedValue(undefined),
    ...rest,
  }
}

function makeMockBrowser(mockPage: object) {
  const mockClose = vi.fn().mockResolvedValue(undefined)
  return {
    browser: {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: mockClose,
    },
    mockClose,
  }
}

describe('POST /api/recipes/parse-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFetch.mockRejectedValue(new Error('Jina fetch failed'))
    vi.stubGlobal('fetch', mockFetch)
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

  it('Puppeteer 失敗 + Jina 失敗の場合は 422 を返し、browser.close が呼ばれる', async () => {
    const mockPage = makeMockPage({
      goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
    })
    const { browser, mockClose } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(422)
    expect(mockClose).toHaveBeenCalled()
  })

  it('Jina 成功: Jina テキストが Gemini に渡され 200 + ParsedRecipe を返す', async () => {
    const jinaText = 'a'.repeat(200)
    mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(jinaText) })
    const mockPage = makeMockPage()
    const { browser, mockClose } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(validParsedRecipe)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining(jinaText)])
    )
    expect(mockClose).toHaveBeenCalled()
  })

  it('Jina 失敗 + Puppeteer テキスト十分: Puppeteer テキストが Gemini に渡され 200 + ParsedRecipe を返す', async () => {
    const puppeteerText = 'a'.repeat(200)
    const mockPage = makeMockPage({
      evaluate: vi.fn().mockResolvedValueOnce(puppeteerText).mockResolvedValueOnce(null),
    })
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(validParsedRecipe)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining(puppeteerText)])
    )
  })

  it('Jina 失敗 + Puppeteer テキスト空: スクリーンショットで Gemini 画像入力、200 + ParsedRecipe を返す', async () => {
    const screenshotBuffer = Buffer.from('fake-png-data')
    const mockPage = makeMockPage({
      evaluate: vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce(null),
      screenshot: vi.fn().mockResolvedValue(screenshotBuffer),
    })
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
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
    const mockPage = makeMockPage()
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'これはJSONではない' },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(500)
  })

  it('Gemini API が例外を投げる場合は 500 を返す', async () => {
    const mockPage = makeMockPage()
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(500)
  })

  it('エラー時も browser.close が呼ばれる (finally)', async () => {
    const mockPage = makeMockPage()
    const { browser, mockClose } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(mockClose).toHaveBeenCalled()
  })

  it('Puppeteer で og:image URL が取得できた場合、レスポンスの imageUrl に含まれる', async () => {
    const imageUrl = 'https://example.com/recipe-image.jpg'
    const mockPage = makeMockPage({ imageUrl })
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.imageUrl).toBe(imageUrl)
  })

  it('画像 URL が取得できない場合は imageUrl が null', async () => {
    const mockPage = makeMockPage({ imageUrl: null })
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.imageUrl).toBeNull()
  })

  it('両方テキスト不十分: スクリーンショット + Vision API、setViewport が呼ばれる', async () => {
    const screenshotBuffer = Buffer.from('fake-png-data')
    const mockPage = makeMockPage({
      evaluate: vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce(null),
      screenshot: vi.fn().mockResolvedValue(screenshotBuffer),
    })
    const { browser } = makeMockBrowser(mockPage)
    mockPuppeteerLaunch.mockResolvedValueOnce(browser)
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validParsedRecipe) },
    })

    const res = await POST(makeRequest({ url: 'https://example.com' }) as unknown as Request)

    expect(res.status).toBe(200)
    expect(mockPage.setViewport).toHaveBeenCalledWith({ width: 1200, height: 1800 })
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ inlineData: expect.objectContaining({ mimeType: 'image/png' }) })])
    )
  })
})
