import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHeicTo } = vi.hoisted(() => {
  const mockHeicTo = vi.fn()
  return { mockHeicTo }
})

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

  it('HEIC は heicConvert でデコードして返す', async () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff])
    mockHeicTo.mockResolvedValue(jpegBuffer)

    const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(mockHeicTo).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'JPEG' })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('JPEG はそのまま返す', async () => {
    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(mockHeicTo).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
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
    mockHeicTo.mockRejectedValue(new Error('heic-convert error'))

    const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
    const res = await POST(makeFormData(file) as unknown as Request)

    expect(res.status).toBe(500)
  })
})
