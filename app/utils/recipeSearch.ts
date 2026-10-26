type SearchableRecipe = { ingredients: Array<{ name: string }> }

// 全角半角・大文字小文字・ひらがなカタカナの表記ゆれを吸収する
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
}

// スペース区切りのキーワードをすべて含む材料を持つレシピに絞り込む（AND検索）
export function filterRecipesByIngredients<T extends SearchableRecipe>(recipes: T[], query: string): T[] {
  const keywords = normalize(query).split(/\s+/).filter(Boolean)
  if (keywords.length === 0) return recipes

  return recipes.filter((recipe) => {
    const names = recipe.ingredients.map((i) => normalize(i.name))
    return keywords.every((keyword) => names.some((name) => name.includes(keyword)))
  })
}
