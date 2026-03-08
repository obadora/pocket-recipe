import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
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
        quality: 1,
      })
      buffer = Buffer.from(converted)
    } else {
      buffer = Buffer.from(arrayBuffer)
    }

    const jpegBuffer = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    return new NextResponse(new Uint8Array(jpegBuffer), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    })
  } catch (err) {
    console.error('Image conversion error:', err)
    return NextResponse.json({ error: 'Failed to convert image' }, { status: 500 })
  }
}
