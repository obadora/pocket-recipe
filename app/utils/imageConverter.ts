'use client'

function isHeic(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}

export async function prepareImageForCrop(file: File): Promise<string> {
  if (isHeic(file)) {
    const { heicTo } = await import('heic-to')
    const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.7 })
    return URL.createObjectURL(blob)
  }
  return URL.createObjectURL(file)
}

export async function convertImage(file: File): Promise<{ convertedFile: File; previewUrl: string }> {
  const { heicTo } = await import('heic-to')
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.7 })
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const convertedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  const previewUrl = URL.createObjectURL(blob)

  return { convertedFile, previewUrl }
}
