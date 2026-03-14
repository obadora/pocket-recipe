import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHeicTo } = vi.hoisted(() => ({
  mockHeicTo: vi.fn(),
}))

vi.mock('heic-to', () => ({ heicTo: mockHeicTo }))

vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

import { prepareImageForCrop, convertImage } from './imageConverter'

describe('imageConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:mock-url')
  })

  describe('prepareImageForCrop', () => {
    it('HEIC は heicTo を呼んで Object URL を返す', async () => {
      const convertedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      const result = await prepareImageForCrop(file)

      expect(mockHeicTo).toHaveBeenCalledWith(
        expect.objectContaining({ blob: file, type: 'image/jpeg' })
      )
      expect(result).toBe('blob:mock-url')
    })

    it('HEIF も heicTo を呼ぶ', async () => {
      const convertedBlob = new Blob([], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const file = new File(['heif-data'], 'photo.heif', { type: 'image/heif' })
      await prepareImageForCrop(file)

      expect(mockHeicTo).toHaveBeenCalled()
    })

    it('拡張子が .heic でも heicTo を呼ぶ（MIME type が空の場合）', async () => {
      const convertedBlob = new Blob([], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const file = new File(['heic-data'], 'photo.heic', { type: '' })
      await prepareImageForCrop(file)

      expect(mockHeicTo).toHaveBeenCalled()
    })

    it('JPEG は heicTo を呼ばず、Object URL をそのまま返す', async () => {
      const file = new File(['jpeg-data'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await prepareImageForCrop(file)

      expect(mockHeicTo).not.toHaveBeenCalled()
      expect(URL.createObjectURL).toHaveBeenCalledWith(file)
      expect(result).toBe('blob:mock-url')
    })

    it('PNG は heicTo を呼ばず、Object URL をそのまま返す', async () => {
      const file = new File(['png-data'], 'photo.png', { type: 'image/png' })
      const result = await prepareImageForCrop(file)

      expect(mockHeicTo).not.toHaveBeenCalled()
      expect(result).toBe('blob:mock-url')
    })

    it('heicTo が失敗した場合はエラーを throw する', async () => {
      mockHeicTo.mockRejectedValue(new Error('conversion failed'))

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      await expect(prepareImageForCrop(file)).rejects.toThrow('conversion failed')
    })
  })

  describe('convertImage', () => {
    it('HEIC は heicTo で変換して File と previewUrl を返す', async () => {
      const convertedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
      const { convertedFile, previewUrl } = await convertImage(file)

      expect(mockHeicTo).toHaveBeenCalledWith(
        expect.objectContaining({ blob: file, type: 'image/jpeg' })
      )
      expect(convertedFile.name).toBe('photo.jpg')
      expect(convertedFile.type).toBe('image/jpeg')
      expect(previewUrl).toBe('blob:mock-url')
    })

    it('heicTo が失敗した場合はエラーを throw する', async () => {
      mockHeicTo.mockRejectedValue(new Error('conversion failed'))

      const file = new File(['data'], 'photo.heic', { type: 'image/heic' })
      await expect(convertImage(file)).rejects.toThrow('conversion failed')
    })
  })
})
