import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '../../utils/supabase/server'
import { prisma } from '../../../lib/prisma'
import DeleteButton from './DeleteButton'

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
    },
  })

  if (!recipe) notFound()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            ← 一覧へ
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 truncate flex-1">{recipe.title}</h1>
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            編集
          </Link>
          <DeleteButton recipeId={recipe.id} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {recipe.imageUrl && (
          <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="relative w-full aspect-video">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl border border-zinc-200 p-6 space-y-3">
          {recipe.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{recipe.description}</p>
          )}
          <div className="flex gap-4 text-sm text-zinc-500">
            {recipe.servings && <span>{recipe.servings}人前</span>}
            {recipe.cookTime && <span>調理時間 {recipe.cookTime}分</span>}
          </div>
          {recipe.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.categories.map(({ category }) => (
                <span key={category.id} className="px-3 py-1 rounded-full text-xs bg-zinc-100 text-zinc-600">
                  {category.name}
                </span>
              ))}
            </div>
          )}
        </section>

        {recipe.ingredients.length > 0 && (
          <section className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">材料</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex justify-between text-sm">
                  <span className="text-zinc-700">{ing.name}</span>
                  {(ing.amount || ing.unit) && (
                    <span className="text-zinc-500">{ing.amount} {ing.unit}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {recipe.steps.length > 0 && (
          <section className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">手順</h2>
            <ol className="space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-700 leading-relaxed pt-0.5">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  )
}
