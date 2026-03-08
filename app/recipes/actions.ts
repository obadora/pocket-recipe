
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'
import { prisma } from '../../lib/prisma'

export type IngredientInput = {
  name: string
  amount: string
  unit: string
}

export type StepInput = {
  description: string
}

export type CreateRecipeInput = {
  title: string
  description: string
  servings: string
  cookTime: string
  ingredients: IngredientInput[]
  steps: StepInput[]
  categories: string[]
  imageUrl?: string
  sourceType?: 'url' | 'photo' | 'manual'
  sourceUrl?: string
}

export async function createRecipe(input: CreateRecipeInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return
  }

  const servings = input.servings ? parseInt(input.servings, 10) : null
  const cookTime = input.cookTime ? parseInt(input.cookTime, 10) : null

  const categoryIds: string[] = []
  for (const name of input.categories) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const category = await prisma.category.upsert({
      where: { name: trimmed },
      update: {},
      create: { name: trimmed },
    })
    categoryIds.push(category.id)
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: input.title,
      description: input.description || null,
      servings,
      cookTime,
      imageUrl: input.imageUrl ?? null,
      sourceType: input.sourceType ?? (input.imageUrl ? 'photo' : 'manual'),
      sourceUrl: input.sourceUrl ?? null,
      ingredients: {
        create: input.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing, index) => ({
            name: ing.name.trim(),
            amount: ing.amount.trim() || null,
            unit: ing.unit.trim() || null,
            order: index,
          })),
      },
      steps: {
        create: input.steps
          .filter((step) => step.description.trim())
          .map((step, index) => ({
            description: step.description.trim(),
            order: index,
          })),
      },
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
  })

  redirect('/')
}

export type UpdateRecipeInput = CreateRecipeInput

export async function updateRecipe(recipeId: string, input: UpdateRecipeInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId: user.id },
  })

  if (!recipe) {
    redirect('/')
    return
  }

  const servings = input.servings ? parseInt(input.servings, 10) : null
  const cookTime = input.cookTime ? parseInt(input.cookTime, 10) : null

  const categoryIds: string[] = []
  for (const name of input.categories) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const category = await prisma.category.upsert({
      where: { name: trimmed },
      update: {},
      create: { name: trimmed },
    })
    categoryIds.push(category.id)
  }

  const filteredIngredients = input.ingredients
    .filter((ing) => ing.name.trim())
    .map((ing, index) => ({
      recipeId,
      name: ing.name.trim(),
      amount: ing.amount.trim() || null,
      unit: ing.unit.trim() || null,
      order: index,
    }))

  const filteredSteps = input.steps
    .filter((step) => step.description.trim())
    .map((step, index) => ({
      recipeId,
      description: step.description.trim(),
      order: index,
    }))

  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId } }),
    prisma.step.deleteMany({ where: { recipeId } }),
    prisma.recipeCategory.deleteMany({ where: { recipeId } }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: input.title,
        description: input.description || null,
        servings,
        cookTime,
        imageUrl: input.imageUrl ?? null,
        sourceType: input.imageUrl ? 'photo' : 'manual',
      },
    }),
    prisma.ingredient.createMany({ data: filteredIngredients }),
    prisma.step.createMany({ data: filteredSteps }),
    prisma.recipeCategory.createMany({
      data: categoryIds.map((categoryId) => ({ recipeId, categoryId })),
    }),
  ])

  redirect(`/recipes/${recipeId}`)
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId: user.id },
  })

  if (!recipe) {
    redirect('/')
    return
  }

  if (recipe.imageUrl) {
    const url = new URL(recipe.imageUrl)
    const pathParts = url.pathname.split('/storage/v1/object/public/recipe-images/')
    if (pathParts[1]) {
      await supabase.storage.from('recipe-images').remove([pathParts[1]])
    }
  }

  await prisma.recipe.delete({ where: { id: recipeId } })
  redirect('/')
}
