import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHeicTo } = vi.hoisted(() => ({
  mockHeicTo: vi.fn(),
}))

vi.mock('heic-to', () => ({ heicTo: mockHeicTo }))

vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:converted'),
  revokeObjectURL: vi.fn(),
})

import { convertImage } from './imageConverter'

describe('convertImage (component env)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:converted')
  })

  it('HEIC を heicTo で変換して File と blob URL を返す', async () => {
    const convertedBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' })
    mockHeicTo.mockResolvedValue(convertedBlob)

    const file = new File(['heic-data'], 'photo.HEIC', { type: 'image/heic' })
    const { convertedFile, previewUrl } = await convertImage(file)

    expect(mockHeicTo).toHaveBeenCalledWith(
      expect.objectContaining({ blob: file, type: 'image/jpeg' })
    )
    expect(convertedFile.name).toBe('photo.jpg')
    expect(convertedFile.type).toBe('image/jpeg')
    expect(previewUrl).toBe('blob:converted')
  })

  it('heicTo が失敗した場合はエラーを throw する', async () => {
    mockHeicTo.mockRejectedValue(new Error('conversion failed'))

    const file = new File(['data'], 'photo.heic', { type: 'image/heic' })
    await expect(convertImage(file)).rejects.toThrow('conversion failed')
  })
})
