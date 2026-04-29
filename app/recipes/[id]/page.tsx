import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '../../utils/supabase/server'
import { prisma } from '../../../lib/prisma'
import DeleteButton from './DeleteButton'
import ImageGallery from './ImageGallery'
import BackButton from './BackButton'

type Props = {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user!.id },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      steps: { orderBy: { order: 'asc' } },
      categories: { include: { category: true } },
      images: { orderBy: { order: 'asc' } },
    },
  })

  if (!recipe) notFound()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton />
          <div className="flex-1" />
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            編集
          </Link>
          <DeleteButton recipeId={recipe.id} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* 上段: 画像 + タイトル・説明 */}
        <div className="flex flex-col lg:flex-row gap-12">
          {recipe.images.length > 0 && (
            <ImageGallery images={recipe.images} alt={recipe.title} />
          )}
          <div className="flex-1 space-y-3">
            <h1 className="text-4xl font-bold text-zinc-900">{recipe.title}</h1>
            {recipe.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.categories.map(({ category }) => (
                  <span key={category.id} className="px-3 py-1 rounded-full text-xs bg-zinc-100 text-zinc-600">
                    {category.name}
                  </span>
                ))}
              </div>
            )}
            {recipe.description && (
              <p className="text-sm text-zinc-600 leading-relaxed">{recipe.description}</p>
            )}
            <div className="flex gap-4 text-sm text-zinc-500">
              {recipe.cookTime && <span>調理時間 {recipe.cookTime}分</span>}
            </div>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors truncate max-w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {recipe.sourceUrl}
              </a>
            )}
          </div>
        </div>

        {/* 下段: 材料 + 作り方 */}
        <div className="flex flex-col lg:flex-row gap-12 lg:items-start">
          {/* 材料 */}
          {recipe.ingredients.length > 0 && (
            <section className="lg:w-96 lg:flex-shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">材料</h2>
              {recipe.servings && (
                <p className="text-sm text-zinc-500 mb-3 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {recipe.servings}人前
                </p>
              )}
              <ul className="divide-y divide-zinc-100">
                {(() => {
                  const items: React.ReactNode[] = []
                  let lastGroup: string | null = undefined as unknown as null
                  for (const ing of recipe.ingredients) {
                    if (ing.group !== lastGroup) {
                      lastGroup = ing.group
                      if (ing.group) {
                        items.push(
                          <li key={`group-${ing.group}`} className="py-1.5 text-xs font-bold text-zinc-400 border-t-0">
                            {ing.group}
                          </li>
                        )
                      }
                    }
                    items.push(
                      <li key={ing.id} className={`flex justify-between py-2 text-sm${ing.group ? ' pl-3' : ''}`}>
                        <span className="text-zinc-700">{ing.name}</span>
                        {(ing.amount || ing.unit) && (
                          <span className="font-medium text-zinc-900">{ing.amount}{ing.unit}</span>
                        )}
                      </li>
                    )
                  }
                  return items
                })()}
              </ul>
            </section>
          )}

          {/* 作り方 */}
          {recipe.steps.length > 0 && (
            <section className="flex-1">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">作り方</h2>
              <ol className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                {recipe.steps.map((step, index) => (
                  <li key={step.id} className="flex flex-col gap-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 text-white text-sm flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    {step.imageUrl && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <Image
                          src={step.imageUrl}
                          alt={`手順${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 300px"
                        />
                      </div>
                    )}
                    <p className="text-sm text-zinc-700 leading-relaxed">{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

      </main>
    </div>
  )
}
