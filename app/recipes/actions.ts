
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../utils/supabase/server'
import { prisma } from '../../lib/prisma'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

export type IngredientInput = {
  name: string
  amount: string
  unit: string
}

export type StepInput = {
  description: string
}

export type RecipeImageInput = {
  url: string
  isMain: boolean
  order: number
}

export type CreateRecipeInput = {
  title: string
  description: string
  servings: string
  cookTime: string
  ingredients: IngredientInput[]
  steps: StepInput[]
  categories: string[]
  images?: RecipeImageInput[]
  sourceType?: 'url' | 'photo' | 'manual'
  sourceUrl?: string
}

export type UpdateRecipeInput = CreateRecipeInput & {
  deletedImageUrls?: string[]
}

const calendarPattern = /^\/calendar\/(\d{4}-\d{2}-\d{2})$/

export async function createRecipe(input: CreateRecipeInput, from?: string) {
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

  // 外部URLの画像をバケットに保存
  let resolvedImages: RecipeImageInput[] = input.images ?? []
  if (input.sourceType === 'url' && resolvedImages.length > 0) {
    const uploadedImages: RecipeImageInput[] = []
    for (const img of resolvedImages) {
      if (!img.url.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
        try {
          const res = await fetch(img.url, { signal: AbortSignal.timeout(10000) })
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer()
            const resized = await sharp(Buffer.from(arrayBuffer))
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer()
            const filePath = `url-imports/${user.id}/${randomUUID()}.jpg`
            const { error } = await supabase.storage
              .from('recipe-images')
              .upload(filePath, resized, { contentType: 'image/jpeg', upsert: false })
            if (!error) {
              const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
              uploadedImages.push({ ...img, url: data.publicUrl })
            }
          }
        } catch {
          // 画像保存失敗時はスキップ
        }
      } else {
        uploadedImages.push(img)
      }
    }
    resolvedImages = uploadedImages
  }

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

  const hasImages = resolvedImages.length > 0
  const sourceType = input.sourceType ?? (hasImages ? 'photo' : 'manual')

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      title: input.title,
      description: input.description || null,
      servings,
      cookTime,
      sourceType,
      sourceUrl: input.sourceUrl ?? null,
      ingredients: {
        create: input.ingredients
          .filter((ing) => ing.name.trim())
          .map((ing, index) => ({
            name: ing.name.trim(),
            amount: String(ing.amount).trim() || null,
            unit: String(ing.unit).trim() || null,
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
      images: {
        create: resolvedImages.map((img) => ({
          url: img.url,
          isMain: img.isMain,
          order: img.order,
        })),
      },
    },
  })

  const calendarMatch = from ? calendarPattern.exec(from) : null
  if (calendarMatch) {
    const dateStr = calendarMatch[1]
    await prisma.mealRecord.create({
      data: {
        userId: user.id,
        recipeId: recipe.id,
        date: new Date(dateStr),
        type: 'cooked',
        mealTime: null,
      },
    })
    redirect(from!)
  }

  redirect('/')
}

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

  const hasImages = (input.images ?? []).length > 0
  const sourceType = hasImages ? 'photo' : 'manual'

  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId } }),
    prisma.step.deleteMany({ where: { recipeId } }),
    prisma.recipeCategory.deleteMany({ where: { recipeId } }),
    prisma.recipeImage.deleteMany({ where: { recipeId } }),
    prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: input.title,
        description: input.description || null,
        servings,
        cookTime,
        sourceType,
      },
    }),
    prisma.ingredient.createMany({ data: filteredIngredients }),
    prisma.step.createMany({ data: filteredSteps }),
    prisma.recipeCategory.createMany({
      data: categoryIds.map((categoryId) => ({ recipeId, categoryId })),
    }),
    prisma.recipeImage.createMany({
      data: (input.images ?? []).map((img) => ({
        recipeId,
        url: img.url,
        isMain: img.isMain,
        order: img.order,
      })),
    }),
  ])

  // deletedImageUrls の Storage 削除
  if (input.deletedImageUrls && input.deletedImageUrls.length > 0) {
    const paths = input.deletedImageUrls.flatMap((url) => {
      try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/storage/v1/object/public/recipe-images/')
        return parts[1] ? [parts[1]] : []
      } catch {
        return []
      }
    })
    if (paths.length > 0) {
      await supabase.storage.from('recipe-images').remove(paths)
    }
  }

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

  const images = await prisma.recipeImage.findMany({
    where: { recipeId },
    select: { url: true },
  })

  if (images.length > 0) {
    const paths = images.flatMap(({ url }) => {
      try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/storage/v1/object/public/recipe-images/')
        return parts[1] ? [parts[1]] : []
      } catch {
        return []
      }
    })
    if (paths.length > 0) {
      await supabase.storage.from('recipe-images').remove(paths)
    }
  }

  await prisma.recipe.delete({ where: { id: recipeId } })
  redirect('/')
}
