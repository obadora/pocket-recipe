import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHeicTo } = vi.hoisted(() => ({
  mockHeicTo: vi.fn(),
}))

vi.mock('heic-to', () => ({ heicTo: mockHeicTo }))

vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

import { prepareImageForCrop, convertImage, prepareImagesForUpload } from './imageConverter'

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

  describe('prepareImagesForUpload', () => {
    it('JPEG 配列は heicTo を呼ばず、{ file, previewUrl } の配列を返す', async () => {
      const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' })

      const result = await prepareImagesForUpload([file1, file2])

      expect(mockHeicTo).not.toHaveBeenCalled()
      expect(result).toHaveLength(2)
      expect(result[0].file).toBe(file1)
      expect(result[1].file).toBe(file2)
      expect(result[0].previewUrl).toBe('blob:mock-url')
      expect(result[1].previewUrl).toBe('blob:mock-url')
    })

    it('HEIC ファイルは変換された File と previewUrl を返す', async () => {
      const convertedBlob = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const file = new File(['heic'], 'photo.heic', { type: 'image/heic' })
      const result = await prepareImagesForUpload([file])

      expect(mockHeicTo).toHaveBeenCalled()
      expect(result[0].file.type).toBe('image/jpeg')
      expect(result[0].previewUrl).toBe('blob:mock-url')
    })

    it('混在配列は HEIC のみ変換する', async () => {
      const convertedBlob = new Blob([], { type: 'image/jpeg' })
      mockHeicTo.mockResolvedValue(convertedBlob)

      const jpeg = new File(['a'], 'photo.jpg', { type: 'image/jpeg' })
      const heic = new File(['b'], 'photo.heic', { type: 'image/heic' })
      const result = await prepareImagesForUpload([jpeg, heic])

      expect(mockHeicTo).toHaveBeenCalledOnce()
      expect(result[0].file).toBe(jpeg)
      expect(result[1].file.type).toBe('image/jpeg')
    })

    it('入力順序を保持する', async () => {
      const file1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
      const file2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
      const file3 = new File(['c'], 'c.jpg', { type: 'image/jpeg' })

      const result = await prepareImagesForUpload([file1, file2, file3])

      expect(result[0].file).toBe(file1)
      expect(result[1].file).toBe(file2)
      expect(result[2].file).toBe(file3)
    })

    it('空配列は空配列を返す', async () => {
      const result = await prepareImagesForUpload([])
      expect(result).toEqual([])
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
