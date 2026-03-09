'use server'

import { createClient } from '../utils/supabase/server'
import { prisma } from '../../lib/prisma'
import { redirect } from 'next/navigation'

export async function createMealRecord(input: { recipeId: string; date: string }): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return
  }

  const recipe = await prisma.recipe.findFirst({
    where: { id: input.recipeId, userId: user.id },
  })

  if (!recipe) return

  await prisma.mealRecord.create({
    data: {
      userId: user.id,
      recipeId: input.recipeId,
      date: new Date(input.date),
    },
  })
}

export async function deleteMealRecord(mealRecordId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return
  }

  const record = await prisma.mealRecord.findFirst({
    where: { id: mealRecordId, userId: user.id },
  })

  if (!record) return

  await prisma.mealRecord.delete({ where: { id: mealRecordId } })
}
