import Link from 'next/link'

type Recipe = {
  id: string
  title: string
  description: string | null
  servings: number | null
  cookTime: number | null
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
    <ul className="space-y-3">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="block bg-white rounded-xl border border-zinc-200 px-5 py-4 hover:border-zinc-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 truncate">{recipe.title}</p>
                {recipe.description && (
                  <p className="text-sm text-zinc-500 truncate mt-0.5">{recipe.description}</p>
                )}
                {recipe.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recipe.categories.map(({ category }) => (
                      <span key={category.id} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-xs text-zinc-400 space-y-1 text-right">
                {recipe.servings && <p>{recipe.servings}人前</p>}
                {recipe.cookTime && <p>{recipe.cookTime}分</p>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
