import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '../../../utils/supabase/server'

const CHROMIUM_REMOTE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar'

const MIN_TEXT_LENGTH = 200
const MAX_TEXT_LENGTH = 20000

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium-min')
    const puppeteerCore = await import('puppeteer-core')
    return puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(CHROMIUM_REMOTE_URL),
      headless: true,
    })
  }
  const puppeteer = await import('puppeteer')
  return puppeteer.default.launch({ headless: true })
}

const TEXT_PROMPT = `以下はWebページから抽出したレシピのテキストです。レシピ情報を抽出し、以下のJSON形式のみで出力してください。
マークダウンや説明文は不要です。JSONのみを返してください。

{
  "title": "レシピのタイトル（見つからない場合はnull）",
  "description": "レシピの説明や概要（見つからない場合はnull）",
  "servings": 人数を表す整数（見つからない場合はnull）,
  "cookTime": 調理時間を分単位の整数（見つからない場合はnull）,
  "ingredients": [
    { "name": "材料名", "amount": "量", "unit": "単位" }
  ],
  "steps": ["手順1の説明", "手順2の説明"]
}

材料の量と単位が分離できない場合（例:「適量」）は amount にそのまま入れ unit は空文字にしてください。
広告・ナビゲーション・SNSリンクなどレシピと無関係な情報は無視してください。
手順は配列の順序通りに並べてください。

テキスト:
`

const IMAGE_PROMPT = `この画像はレシピページのスクリーンショットです。画像からレシピ情報を抽出し、以下のJSON形式のみで出力してください。
マークダウンや説明文は不要です。JSONのみを返してください。

{
  "title": "レシピのタイトル（見つからない場合はnull）",
  "description": "レシピの説明や概要（見つからない場合はnull）",
  "servings": 人数を表す整数（見つからない場合はnull）,
  "cookTime": 調理時間を分単位の整数（見つからない場合はnull）,
  "ingredients": [
    { "name": "材料名", "amount": "量", "unit": "単位" }
  ],
  "steps": ["手順1の説明", "手順2の説明"]
}

材料の量と単位が分離できない場合（例:「適量」）は amount にそのまま入れ unit は空文字にしてください。
手順は配列の順序通りに並べてください。`


async function fetchViaJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const res = await fetch(jinaUrl, {
    headers: { 'Accept': 'text/plain' },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Jina fetch failed: ${res.status}`)
  return res.text()
}

async function sendToGemini(content: string | Buffer, type: 'text' | 'image') {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
  const modelName = process.env.GEMINI_MODEL!
  const model = genAI.getGenerativeModel({ model: modelName })

  let result
  if (type === 'image') {
    const base64 = (content as Buffer).toString('base64')
    result = await model.generateContent([
      IMAGE_PROMPT,
      { inlineData: { mimeType: 'image/png', data: base64 } },
    ])
  } else {
    const truncated = (content as string).slice(0, MAX_TEXT_LENGTH)
    result = await model.generateContent([TEXT_PROMPT + truncated])
  }

  const text = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(text)
}

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { url } = body

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 })
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 })
  }

  const t0 = Date.now()
  const elapsed = () => `${Date.now() - t0}ms`
  const log = (msg: string) => console.log(`[parse-url] ${msg} elapsed=${elapsed()}`)

  log(`start url=${url}`)

  const browser = await launchBrowser()
  log('browser launched')

  try {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(30000)
    await page.setRequestInterception(true)
    page.on('request', (req: { resourceType: () => string; abort: () => void; continue: () => void }) => {
      const blocked = ['image', 'stylesheet', 'font', 'media']
      if (blocked.includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    // Jina（テキスト専用）と Puppeteer（テキスト+画像URL）を並列実行
    const jinaPromise = (async () => {
      log('Jina fetch start')
      const text = await fetchViaJina(url)
      log(`Jina fetch done textLength=${text.length}`)
      return text
    })()

    const puppeteerPromise = (async () => {
      log('Puppeteer page.goto start')
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      log('Puppeteer page.goto done')
      const text: string = await page.evaluate(() => {
        const selectors = 'header, footer, nav, aside, script, style, noscript, iframe'
        document.querySelectorAll(selectors).forEach((el) => el.remove())
        return (document.body?.innerText ?? '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join('\n')
      })
      log(`Puppeteer evaluate done textLength=${text.length}`)
      const imageUrl: string | null = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
        if (og) return og
        const img = document.querySelector('img[src]')?.getAttribute('src')
        return img || null
      })
      log(`Puppeteer image url=${imageUrl}`)
      return { text, imageUrl }
    })()

    // Jina と Puppeteer を並列で待つ（両方完了を待つ）
    const [jinaResult, puppeteerResult] = await Promise.allSettled([jinaPromise, puppeteerPromise])

    const jinaText = jinaResult.status === 'fulfilled' && jinaResult.value.length >= MIN_TEXT_LENGTH
      ? jinaResult.value
      : null
    const puppeteerText = puppeteerResult.status === 'fulfilled' && puppeteerResult.value.text.length >= MIN_TEXT_LENGTH
      ? puppeteerResult.value.text
      : null
    const pageImageUrl = puppeteerResult.status === 'fulfilled'
      ? puppeteerResult.value.imageUrl
      : null

    if (jinaText) log(`using jina text (${jinaText.length} chars)`)
    else if (puppeteerText) log(`using puppeteer text (${puppeteerText.length} chars)`)

    const winnerText = jinaText ?? puppeteerText

    if (winnerText) {
      const parsed = await sendToGemini(winnerText, 'text')
      log('Gemini done (source=text)')
      return NextResponse.json({ ...parsed, imageUrl: pageImageUrl }, { status: 200 })
    }

    // 両方テキスト不十分かつ Puppeteer 失敗 → 422
    if (puppeteerResult.status === 'rejected') {
      log(`both failed, Puppeteer error: ${puppeteerResult.reason}`)
      return NextResponse.json({ error: 'URL_FETCH_FAILED' }, { status: 422 })
    }

    // スクリーンショット + Gemini Vision
    log('both text insufficient, taking screenshot')
    await page.setViewport({ width: 1200, height: 1800 })
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' }) as Buffer
    log('screenshot done')
    const parsed = await sendToGemini(screenshotBuffer, 'image')
    log('Gemini done (source=screenshot)')
    return NextResponse.json({ ...parsed, imageUrl: pageImageUrl }, { status: 200 })

  } catch (err) {
    console.error('Recipe URL parse error:', err)
    return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 })
  } finally {
    await browser.close()
  }
}
