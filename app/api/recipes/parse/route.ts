import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '../../../utils/supabase/server'

const PROMPT = `この画像はレシピ本のページです。画像からレシピ情報を抽出し、以下のJSON形式のみで出力してください。
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const image = formData.get('image')
    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { mimeType: image.type || 'image/jpeg', data: base64 } },
    ])

    const text = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed, { status: 200 })
  } catch (err) {
    console.error('Recipe parse error:', err)
    return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 })
  }
}
