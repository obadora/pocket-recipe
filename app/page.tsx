import { Suspense } from 'react'
import { createClient } from './utils/supabase/server'
import { prisma } from '../lib/prisma'
import HomeTabs from './components/HomeTabs'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [recipes, mealRecords] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        servings: true,
        cookTime: true,
        imageUrl: true,
        categories: { include: { category: true } },
      },
    }),
    prisma.mealRecord.findMany({
      where: { userId: user!.id },
      include: { recipe: { select: { id: true, title: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  return (
    <Suspense>
      <HomeTabs
        recipes={recipes}
        mealRecords={mealRecords}
        user={{ email: user?.email }}
        recipeCount={recipes.length}
      />
    </Suspense>
  )
}
