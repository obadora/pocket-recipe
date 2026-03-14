'use client'

import { useState, useTransition, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createRecipe, type IngredientInput, type StepInput } from '../actions'
import { createClient } from '../../utils/supabase/client'
import { convertImage } from '../../utils/imageConverter'

function NewRecipePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? undefined
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('ファイルサイズは10MB以下にしてください。')
      return
    }
    setUploadError(null)
    try {
      const { convertedFile, previewUrl } = await convertImage(file)
      setImageFile(convertedFile)
      setImagePreviewUrl(previewUrl)
    } catch {
      setUploadError('画像の変換に失敗しました。もう一度お試しください。')
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreviewUrl(null)
    setUploadError(null)
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
        let imageUrl: string | undefined
        if (imageFile) {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setUploadError('セッションが切れました。再ログインしてください。')
            return
          }
          const path = `photos/${user.id}/${crypto.randomUUID()}.jpg`
          const { error: uploadErr } = await supabase.storage.from('recipe-images').upload(path, imageFile)
          if (uploadErr) {
            console.error('Storageアップロードエラー:', uploadErr)
            setUploadError(`写真のアップロードに失敗しました。(${uploadErr.message})`)
            return
          }
          const { data: { publicUrl } } = supabase.storage.from('recipe-images').getPublicUrl(path)
          imageUrl = publicUrl
        }
        await createRecipe({ title, description, servings, cookTime, ingredients, steps, categories, imageUrl }, from)
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
          <h1 className="text-lg font-semibold text-zinc-900">レシピを登録</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* 写真 */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">写真 <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500">任意</span></h2>
            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {uploadError}
              </p>
            )}
            {imagePreviewUrl ? (
              <div className="space-y-2">
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-zinc-100">
                  <img src={imagePreviewUrl} alt="プレビュー" className="w-full h-full object-cover" />
                </div>
                <button type="button" onClick={clearImage} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                  写真を削除
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-zinc-300 cursor-pointer hover:border-zinc-400 transition-colors">
                <span className="text-sm text-zinc-500">タップして写真を選択</span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="写真を選択"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </section>

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

export default function NewRecipePage() {
  return (
    <Suspense>
      <NewRecipePageInner />
    </Suspense>
  )
}
