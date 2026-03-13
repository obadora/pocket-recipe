import { NextRequest, NextResponse } from 'next/server'
import heicConvert from 'heic-convert'

const HEIC_TYPES = ['image/heic', 'image/heif']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    let buffer: Buffer

    if (HEIC_TYPES.includes(file.type.toLowerCase())) {
      const converted = await heicConvert({
        buffer: new Uint8Array(arrayBuffer) as unknown as ArrayBuffer,
        format: 'JPEG',
        quality: 0.7,
      })
      buffer = Buffer.from(converted)
    } else {
      buffer = Buffer.from(arrayBuffer)
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    })
  } catch (err) {
    console.error('Image conversion error:', err)
    return NextResponse.json({ error: 'Failed to convert image' }, { status: 500 })
  }
}
