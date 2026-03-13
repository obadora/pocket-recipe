import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

import { prepareImageForCrop, convertImage } from './imageConverter'

function makeJpegResponse() {
  const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
  return Promise.resolve(new Response(blob, { status: 200 }))
}

describe('imageConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:mock-url')
  })

  describe('prepareImageForCrop', () => {
    it('HEIC は /api/images/convert に POST して Object URL を返す', async () => {
      mockFetch.mockReturnValue(makeJpegResponse())

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      const result = await prepareImageForCrop(file)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/images/convert',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toBe('blob:mock-url')
    })

    it('HEIF も /api/images/convert に POST する', async () => {
      mockFetch.mockReturnValue(makeJpegResponse())

      const file = new File(['heif-data'], 'photo.heif', { type: 'image/heif' })
      await prepareImageForCrop(file)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('拡張子が .heic でも変換APIを呼ぶ（MIME type が空の場合）', async () => {
      mockFetch.mockReturnValue(makeJpegResponse())

      const file = new File(['heic-data'], 'photo.heic', { type: '' })
      await prepareImageForCrop(file)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('JPEG は API を呼ばず、Object URL をそのまま返す', async () => {
      const file = new File(['jpeg-data'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await prepareImageForCrop(file)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
      expect(result).toBe('blob:mock-url')
    })

    it('PNG は API を呼ばず、Object URL をそのまま返す', async () => {
      const file = new File(['png-data'], 'photo.png', { type: 'image/png' })
      const result = await prepareImageForCrop(file)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result).toBe('blob:mock-url')
    })

    it('API が失敗した場合はエラーを throw する', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      await expect(prepareImageForCrop(file)).rejects.toThrow('Failed to convert image')
    })
  })

  describe('convertImage', () => {
    it('/api/images/convert に POST して File と previewUrl を返す', async () => {
      mockFetch.mockReturnValue(makeJpegResponse())

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      const { convertedFile, previewUrl } = await convertImage(file)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/images/convert',
        expect.objectContaining({ method: 'POST' })
      )
      expect(convertedFile.name).toBe('photo.jpg')
      expect(convertedFile.type).toBe('image/jpeg')
      expect(previewUrl).toBe('blob:mock-url')
    })

    it('API が失敗した場合はエラーを throw する', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
      await expect(convertImage(file)).rejects.toThrow('Failed to convert image')
    })
  })
})
