import Image from 'next/image'
import Link from 'next/link'

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  cookTime: number | null
  images: Array<{ url: string; isMain: boolean; order: number }>
  categories: Array<{ category: { id: string; name: string } }>
}

type RecipeListProps = { recipes: Recipe[] }

export default function RecipeList({ recipes }: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 mb-4">レシピがまだありません。</p>
        <Link href="/recipes/new" className="text-sm font-medium text-zinc-900 underline underline-offset-2">
          最初のレシピを登録する
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex flex-col bg-white rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors overflow-hidden h-full"
          >
            {recipe.images[0]?.url ? (
              <div className="relative aspect-square w-full">
                <Image
                  src={recipe.images[0].url}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            ) : (
              <div className="aspect-square w-full bg-zinc-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
              </div>
            )}
            <div className="flex flex-col flex-1 p-3 gap-1">
              <p className="font-medium text-zinc-900 text-sm leading-snug line-clamp-2">{recipe.title}</p>
              {recipe.description && (
                <p className="text-xs text-zinc-500 line-clamp-2">{recipe.description}</p>
              )}
              <div className="flex-1" />
              {recipe.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {recipe.categories.map(({ category }) => (
                    <span key={category.id} className="px-1.5 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
              {(recipe.servings || recipe.cookTime) && (
                <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                  {recipe.servings && <span>{recipe.servings}人前</span>}
                  {recipe.cookTime && <span>{recipe.cookTime}分</span>}
                </div>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
