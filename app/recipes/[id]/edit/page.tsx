import { notFound } from 'next/navigation'
import { createClient } from '../../../utils/supabase/server'
import { prisma } from '../../../../lib/prisma'
import EditRecipeForm from './EditRecipeForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user!.id },
    include: {
      ingredients: { orderBy: { order: 'asc' } },
      steps: { orderBy: { order: 'asc' } },
      categories: { include: { category: true } },
    },
  })

  if (!recipe) notFound()

  const initialValues = {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: recipe.servings ? String(recipe.servings) : '',
    cookTime: recipe.cookTime ? String(recipe.cookTime) : '',
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount ?? '',
      unit: ing.unit ?? '',
    })),
    steps: recipe.steps.map((step) => ({ description: step.description })),
    categories: recipe.categories.map((rc) => rc.category.name),
  }

  return <EditRecipeForm recipeId={recipe.id} initialValues={initialValues} />
}
