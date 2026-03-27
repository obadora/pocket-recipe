import { describe, it, expect } from 'vitest'
import { normalizeUrl } from './urlNormalizer'

describe('normalizeUrl', () => {
  it('フラグメントなし正常URL → そのまま返す', () => {
    expect(normalizeUrl('https://example.com/recipe/123')).toBe('https://example.com/recipe/123')
  })

  it('#share_ios フラグメント → 除去する', () => {
    expect(normalizeUrl('https://delishkitchen.tv/recipes/147726740259602726#share_ios')).toBe(
      'https://delishkitchen.tv/recipes/147726740259602726'
    )
  })

  it('#share_android フラグメント → 除去する', () => {
    expect(normalizeUrl('https://example.com/recipe#share_android')).toBe(
      'https://example.com/recipe'
    )
  })

  it('utm_source パラメータ → 除去する', () => {
    expect(normalizeUrl('https://example.com/recipe?utm_source=twitter')).toBe(
      'https://example.com/recipe'
    )
  })

  it('utm_medium + utm_campaign → 両方除去する', () => {
    expect(normalizeUrl('https://example.com/recipe?utm_medium=social&utm_campaign=summer')).toBe(
      'https://example.com/recipe'
    )
  })

  it('UTMと非UTMが混在 → UTMのみ除去、他は保持する', () => {
    expect(normalizeUrl('https://example.com/recipe?id=123&utm_source=twitter&page=1')).toBe(
      'https://example.com/recipe?id=123&page=1'
    )
  })

  it('日本語テキスト + スペース + URL → URLを抽出する', () => {
    expect(
      normalizeUrl('パクパク食べれる！基本のホイコーロー https://delishkitchen.tv/recipes/147726740259602726')
    ).toBe('https://delishkitchen.tv/recipes/147726740259602726')
  })

  it('テキスト埋め込みURL + フラグメント → 抽出してフラグメント除去する', () => {
    expect(
      normalizeUrl('台湾まぜうどん https://example.com/recipe/456#share_ios')
    ).toBe('https://example.com/recipe/456')
  })

  it('テキスト埋め込みURL + UTM → 抽出してUTM除去する', () => {
    expect(
      normalizeUrl('レシピ https://example.com/recipe?utm_source=app')
    ).toBe('https://example.com/recipe')
  })

  it('全角スペース区切り → URLを抽出する', () => {
    expect(
      normalizeUrl('パクパク食べれる！　https://example.com/recipe/789')
    ).toBe('https://example.com/recipe/789')
  })

  it('URLを含まない文字列 → null を返す', () => {
    expect(normalizeUrl('これはURLではありません')).toBeNull()
  })

  it('空文字列 → null を返す', () => {
    expect(normalizeUrl('')).toBeNull()
  })

  it('ftp:// URL → null を返す', () => {
    expect(normalizeUrl('ftp://example.com/file')).toBeNull()
  })

  it('テキストに ftp:// と https:// が両方ある → https:// のURLを返す', () => {
    expect(normalizeUrl('ftp://old.com https://example.com/recipe')).toBe('https://example.com/recipe')
  })
})
