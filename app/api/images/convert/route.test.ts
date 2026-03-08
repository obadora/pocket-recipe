import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSharpInstance, mockToBuffer, mockHeicTo } = vi.hoisted(() => {
  const mockToBuffer = vi.fn()
  const mockSharpInstance = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: mockToBuffer,
  }
  const mockHeicTo = vi.fn()
  return { mockSharpInstance, mockToBuffer, mockHeicTo }
})

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue(mockSharpInstance),
}))

vi.mock('heic-convert', () => ({
  default: mockHeicTo,
}))

import { POST } from './route'

function makeFormData(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return new Request('http://localhost/api/images/convert', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/images/convert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('JPEG/PNG は sharp に直接渡して変換する', async () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff])
    mockToBuffer.mockResolvedValue(jpegBuffer)

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(mockHeicTo).not.toHaveBeenCalled()
    expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 85 })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('HEIC は heicConvert でデコードしてから sharp に渡す', async () => {
    const decodedBuffer = new ArrayBuffer(4)
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff])
    mockHeicTo.mockResolvedValue(decodedBuffer)
    mockToBuffer.mockResolvedValue(jpegBuffer)

    const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(mockHeicTo).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'JPEG', quality: 1 })
    )
    expect(mockSharpInstance.resize).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('ファイルがない場合は 400 を返す', async () => {
    const req = new Request('http://localhost/api/images/convert', {
      method: 'POST',
      body: new FormData(),
    })

    const res = await POST(req as unknown as Request)

    expect(res.status).toBe(400)
  })

  it('変換失敗時は 500 を返す', async () => {
    mockToBuffer.mockRejectedValue(new Error('sharp error'))

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(res.status).toBe(500)
  })
})
