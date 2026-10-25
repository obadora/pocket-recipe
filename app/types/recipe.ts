export type ParsedIngredient = {
  name: string
  amount: string
  unit: string
  group: string | null
}

export type ParsedRecipe = {
  title: string | null
  description: string | null
  servings: number | null
  cookTime: number | null
  ingredients: ParsedIngredient[]
  steps: string[]
  imageUrl: string | null
}
