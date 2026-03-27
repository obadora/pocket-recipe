export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 直接URLとして解析を試みる
  let rawUrl = trimmed
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return cleanUrl(parsed)
    }
    // http/https以外（ftp:// など）は次のステップへ
  } catch {
    // URLとして解析失敗 → テキスト内からURLを探す
  }

  // テキスト内の最初の http:// または https:// のURLを抽出（全角スペース対応）
  const match = trimmed.match(/(https?:\/\/[^\s　]+)/)
  if (!match) return null

  try {
    const parsed = new URL(match[1])
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return cleanUrl(parsed)
  } catch {
    return null
  }
}

function cleanUrl(url: URL): string {
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_')) {
      url.searchParams.delete(key)
    }
  }
  return url.toString()
}
