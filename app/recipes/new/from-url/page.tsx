'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createRecipe, type IngredientInput, type StepInput } from '../../actions'
import { parseRecipeFromUrl } from '../../../utils/recipeUrlParser'
import { normalizeUrl } from '../../../utils/urlNormalizer'

function FromUrlPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? undefined
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', amount: '', unit: '' },
  ])
  const [steps, setSteps] = useState<StepInput[]>([{ description: '' }])
  const [categoryInput, setCategoryInput] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [parsedImageUrl, setParsedImageUrl] = useState<string | null>(null)

  const handleLoadUrl = async () => {
    if (!url.trim()) {
      setUrlError('URLを入力してください。')
      return
    }
    const normalized = normalizeUrl(url)
    if (!normalized) {
      setUrlError('有効なURLを入力してください。')
      return
    }
    setUrl(normalized)
    setUrlError(null)
    setParseError(null)
    setIsParsing(true)
    try {
      const parsed = await parseRecipeFromUrl(normalized)
      if (parsed.title !== null) setTitle(parsed.title)
      if (parsed.description !== null) setDescription(parsed.description)
      if (parsed.servings !== null) setServings(String(parsed.servings))
      if (parsed.cookTime !== null) setCookTime(String(parsed.cookTime))
      if (parsed.ingredients.length > 0) setIngredients(
        parsed.ingredients.map((ing) => ({
          name: ing.name ?? '',
          amount: ing.amount ?? '',
          unit: ing.unit ?? '',
        }))
      )
      if (parsed.steps.length > 0) setSteps(parsed.steps.map((s) => ({ description: s })))
      setParsedImageUrl(parsed.imageUrl)
    } catch {
      setParseError('解析に失敗しました。もう一度お試しください。')
    } finally {
      setIsParsing(false)
    }
  }

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { name: '', amount: '', unit: '' }])
  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  const updateIngredient = (index: number, field: keyof IngredientInput, value: string) =>
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )

  const addStep = () => setSteps((prev) => [...prev, { description: '' }])
  const removeStep = (index: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== index))
  const updateStep = (index: number, value: string) =>
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { description: value } : step))
    )

  const addCategory = () => {
    const trimmed = categoryInput.trim()
    if (!trimmed || categories.includes(trimmed)) return
    setCategories((prev) => [...prev, trimmed])
    setCategoryInput('')
  }
  const removeCategory = (name: string) =>
    setCategories((prev) => prev.filter((c) => c !== name))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('タイトルを入力してください。')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const images = parsedImageUrl
          ? [{ url: parsedImageUrl, isMain: true, order: 0 }]
          : []
        await createRecipe({
          title,
          description,
          servings,
          cookTime,
          ingredients,
          steps,
          categories,
          images,
          sourceType: 'url',
          sourceUrl: url,
        }, from)
      } catch (err) {
        if (isRedirectError(err)) throw err
        console.error('保存エラー:', err)
        setError('保存に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← 戻る
          </button>
          <h1 className="text-lg font-semibold text-zinc-900">URLからレシピを作成</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* URL 入力 */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">レシピURL</h2>
            {urlError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {urlError}
              </p>
            )}
            {parseError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {parseError}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="button"
                onClick={handleLoadUrl}
                disabled={isParsing}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isParsing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    URL読み取り中...
                  </>
                ) : (
                  'URLから読み込む'
                )}
              </button>
            </div>
          </section>

          {/* 画像プレビュー */}
          {parsedImageUrl && (
            <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-2">
              <h2 className="text-base font-semibold text-zinc-900">画像</h2>
              <div className="w-full rounded-lg overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={parsedImageUrl!}
                  alt="レシピ画像"
                  className="w-full object-cover"
                />
              </div>
            </section>
          )}

          {/* 基本情報 */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">基本情報</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                タイトル <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">必須</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 肉じゃが"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">説明・メモ <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="レシピの概要や備考など"
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">人数 <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="2"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">人</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">調理時間 <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    placeholder="30"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">分</span>
                </div>
              </div>
            </div>
          </section>

          {/* カテゴリ */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">カテゴリ <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                placeholder="例: 和食、夕食、お弁当"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                追加
              </button>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-zinc-100 text-zinc-700">
                    {cat}
                    <button type="button" onClick={() => removeCategory(cat)} className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 材料 */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">材料 <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></h2>
            <div className="space-y-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="材料名"
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    placeholder="量"
                    className="w-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    placeholder="単位"
                    className="w-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  {ingredients.length > 1 && (
                    <button type="button" onClick={() => removeIngredient(index)} className="text-zinc-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addIngredient} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              + 材料を追加
            </button>
          </section>

          {/* 手順 */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">手順 <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></h2>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <span className="mt-2.5 flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder={`手順 ${index + 1}`}
                    rows={2}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                  />
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(index)} className="mt-2.5 text-zinc-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              + 手順を追加
            </button>
          </section>

          {/* 送信 */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? '保存中...' : 'レシピを保存'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function FromUrlPage() {
  return (
    <Suspense>
      <FromUrlPageInner />
    </Suspense>
  )
}
