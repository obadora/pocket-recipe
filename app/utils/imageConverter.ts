export async function convertImage(file: File): Promise<{ convertedFile: File; previewUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/images/convert', { method: 'POST', body: formData })

  if (!res.ok) {
    throw new Error('Failed to convert image')
  }

  const blob = await res.blob()
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const convertedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  const previewUrl = URL.createObjectURL(blob)

  return { convertedFile, previewUrl }
}
