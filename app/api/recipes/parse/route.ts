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
    { "name": "材料名", "amount": "量", "unit": "単位", "group": null },
    { "name": "醤油", "amount": "大さじ1", "unit": "", "group": "A" }
  ],
  "steps": ["手順1の説明", "手順2の説明"]
}

材料の量と単位が分離できない場合（例:「適量」）は amount にそのまま入れ unit は空文字にしてください。
材料がA・B・【A】・(A)などの記号でグループ化されている場合は、group フィールドにアルファベット1文字（例："A"、"B"）を入れてください。グループに属さない材料は group を null にしてください。
手順は配列の順序通りに並べてください。`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()

    // Support both multi-image (images[]) and legacy single-image (image) fields
    const multiImages = formData.getAll('images[]').filter((v): v is File => v instanceof File)
    const legacyImage = formData.get('image')
    const images: File[] = multiImages.length > 0
      ? multiImages
      : legacyImage instanceof File ? [legacyImage] : []

    if (images.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const inlineParts = await Promise.all(
      images.map(async (img) => {
        const arrayBuffer = await img.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        return { inlineData: { mimeType: img.type || 'image/jpeg', data: base64 } }
      })
    )

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL! })

    const result = await model.generateContent([PROMPT, ...inlineParts])

    const text = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(text)

    return NextResponse.json(parsed, { status: 200 })
  } catch (err) {
    console.error('Recipe parse error:', err)
    return NextResponse.json({ error: 'Failed to parse recipe' }, { status: 500 })
  }
}
