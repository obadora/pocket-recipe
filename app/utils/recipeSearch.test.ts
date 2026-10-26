import { describe, it, expect } from 'vitest'
import { filterRecipesByIngredients } from './recipeSearch'

const makeRecipe = (id: string, names: string[]) => ({
  id,
  ingredients: names.map((name) => ({ name })),
})

const recipes = [
  makeRecipe('nikujaga', ['じゃがいも', '牛肉', '玉ねぎ', 'にんじん']),
  makeRecipe('curry', ['ジャガイモ', '鶏肉', '玉ねぎ', 'カレールー']),
  makeRecipe('salad', ['レタス', 'トマト', 'Olive Oil']),
]

const ids = (result: { id: string }[]) => result.map((r) => r.id)

describe('filterRecipesByIngredients', () => {
  it('空のクエリのときは全件を返す', () => {
    expect(ids(filterRecipesByIngredients(recipes, ''))).toEqual(['nikujaga', 'curry', 'salad'])
  })

  it('空白のみのクエリのときは全件を返す', () => {
    expect(ids(filterRecipesByIngredients(recipes, '  　 '))).toEqual(['nikujaga', 'curry', 'salad'])
  })

  it('材料名の部分一致で絞り込む', () => {
    expect(ids(filterRecipesByIngredients(recipes, '肉'))).toEqual(['nikujaga', 'curry'])
  })

  it('スペース区切りの複数キーワードはすべて含むレシピに絞り込む（AND）', () => {
    expect(ids(filterRecipesByIngredients(recipes, '玉ねぎ 鶏肉'))).toEqual(['curry'])
  })

  it('全角スペースでも区切れる', () => {
    expect(ids(filterRecipesByIngredients(recipes, '玉ねぎ　牛肉'))).toEqual(['nikujaga'])
  })

  it('ひらがなとカタカナの違いを区別しない', () => {
    expect(ids(filterRecipesByIngredients(recipes, 'じゃがいも'))).toEqual(['nikujaga', 'curry'])
    expect(ids(filterRecipesByIngredients(recipes, 'ニンジン'))).toEqual(['nikujaga'])
  })

  it('英字の大文字小文字・全角半角を区別しない', () => {
    expect(ids(filterRecipesByIngredients(recipes, 'ｏｌｉｖｅ'))).toEqual(['salad'])
  })

  it('一致しないときは空配列を返す', () => {
    expect(filterRecipesByIngredients(recipes, 'さば')).toEqual([])
  })
})
