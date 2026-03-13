import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:converted'),
  revokeObjectURL: vi.fn(),
})

import { convertImage } from './imageConverter'

function makeJpegResponse() {
  const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
  return Promise.resolve(new Response(blob, { status: 200 }))
}

describe('convertImage (component env)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('/api/images/convert に POST して File と blob URL を返す', async () => {
    mockFetch.mockReturnValue(makeJpegResponse())

    const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
    const { convertedFile, previewUrl } = await convertImage(file)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/images/convert',
      expect.objectContaining({ method: 'POST' })
    )
    expect(convertedFile.name).toBe('photo.jpg')
    expect(convertedFile.type).toBe('image/jpeg')
    expect(previewUrl).toBe('blob:converted')
  })

  it('API が 500 を返した場合はエラーを throw する', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(convertImage(file)).rejects.toThrow('Failed to convert image')
  })
})
