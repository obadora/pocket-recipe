import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '../../../utils/supabase/server'

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = await import('@sparticuz/chromium')
    const puppeteerCore = await import('puppeteer-core')
    return puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
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

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(30000)

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })
    } catch {
      return NextResponse.json({ error: 'URL_FETCH_FAILED' }, { status: 422 })
    }

    const scrapedText: string = await page.evaluate(() => {
      const selectors = 'header, footer, nav, aside, script, style, noscript, iframe'
      document.querySelectorAll(selectors).forEach((el) => el.remove())
      return (document.body?.innerText ?? '')
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join('\n')
    })

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    let result
    if (scrapedText.length === 0) {
      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' }) as Buffer
      const base64 = screenshotBuffer.toString('base64')
      result = await model.generateContent([
        IMAGE_PROMPT,
        { inlineData: { mimeType: 'image/png', data: base64 } },
      ])
    } else {
      result = await model.generateContent([TEXT_PROMPT + scrapedText])
    }

    const text = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed, { status: 200 })
  } catch (err) {
    console.error('Recipe URL parse error:', err)
    return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 })
  } finally {
    await browser.close()
  }
}
