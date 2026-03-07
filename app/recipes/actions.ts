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
      sourceType: 'manual',
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
