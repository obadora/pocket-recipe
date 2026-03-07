import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockRecipeCreate,
  mockCategoryUpsert,
  mockRecipeDelete,
  mockRecipeFindFirst,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRecipeCreate: vi.fn(),
  mockCategoryUpsert: vi.fn(),
  mockRecipeDelete: vi.fn(),
  mockRecipeFindFirst: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock('../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('../../lib/prisma', () => ({
  prisma: {
    recipe: { create: mockRecipeCreate, delete: mockRecipeDelete, findFirst: mockRecipeFindFirst },
    category: { upsert: mockCategoryUpsert },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { createRecipe, deleteRecipe } from './actions'

const baseInput = {
  title: '肉じゃが',
  description: '',
  servings: '',
  cookTime: '',
  ingredients: [{ name: 'じゃがいも', amount: '2', unit: '個' }],
  steps: [{ description: '具材を炒める' }],
  categories: [],
}

describe('createRecipe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('未認証の場合: /login にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await createRecipe(baseInput)

    expect(mockRecipeCreate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('成功時: prisma.recipe.create を呼び、/ にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe(baseInput)

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          title: '肉じゃが',
          sourceType: 'manual',
        }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('servings・cookTime が数値文字列の場合: parseInt して渡す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({ ...baseInput, servings: '4', cookTime: '30' })

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          servings: 4,
          cookTime: 30,
        }),
      })
    )
  })

  it('servings・cookTime が空文字の場合: null を渡す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({ ...baseInput, servings: '', cookTime: '' })

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          servings: null,
          cookTime: null,
        }),
      })
    )
  })

  it('name が空の材料はフィルタリングされる', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({
      ...baseInput,
      ingredients: [
        { name: 'じゃがいも', amount: '2', unit: '個' },
        { name: '  ', amount: '', unit: '' }, // 空白のみ → フィルタ対象
      ],
    })

    const createCall = mockRecipeCreate.mock.calls[0][0]
    expect(createCall.data.ingredients.create).toHaveLength(1)
    expect(createCall.data.ingredients.create[0].name).toBe('じゃがいも')
  })

  it('description が空の手順はフィルタリングされる', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({
      ...baseInput,
      steps: [
        { description: '具材を炒める' },
        { description: '' }, // 空 → フィルタ対象
      ],
    })

    const createCall = mockRecipeCreate.mock.calls[0][0]
    expect(createCall.data.steps.create).toHaveLength(1)
    expect(createCall.data.steps.create[0].description).toBe('具材を炒める')
  })

  it('材料の order は配列インデックス順になる', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({
      ...baseInput,
      ingredients: [
        { name: 'じゃがいも', amount: '2', unit: '個' },
        { name: '玉ねぎ', amount: '1', unit: '個' },
        { name: '牛肉', amount: '200', unit: 'g' },
      ],
    })

    const createCall = mockRecipeCreate.mock.calls[0][0]
    const ings = createCall.data.ingredients.create
    expect(ings[0].order).toBe(0)
    expect(ings[1].order).toBe(1)
    expect(ings[2].order).toBe(2)
  })

  it('カテゴリがある場合: prisma.category.upsert を呼ぶ', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockCategoryUpsert
      .mockResolvedValueOnce({ id: 'cat-1' })
      .mockResolvedValueOnce({ id: 'cat-2' })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({ ...baseInput, categories: ['和食', '夕食'] })

    expect(mockCategoryUpsert).toHaveBeenCalledTimes(2)
    expect(mockCategoryUpsert).toHaveBeenCalledWith({
      where: { name: '和食' },
      update: {},
      create: { name: '和食' },
    })
    const createCall = mockRecipeCreate.mock.calls[0][0]
    expect(createCall.data.categories.create).toEqual([
      { categoryId: 'cat-1' },
      { categoryId: 'cat-2' },
    ])
  })

  it('空文字カテゴリはスキップする', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockCategoryUpsert.mockResolvedValue({ id: 'cat-1' })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({ ...baseInput, categories: ['和食', '  ', ''] })

    // '  ' と '' はスキップされるので upsert は1回のみ
    expect(mockCategoryUpsert).toHaveBeenCalledTimes(1)
    expect(mockCategoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: '和食' } })
    )
  })
})

describe('deleteRecipe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('未認証の場合: prisma.recipe.delete を呼ばず /login にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await deleteRecipe('recipe-1')

    expect(mockRecipeDelete).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('他人のレシピの場合: prisma.recipe.delete を呼ばず / にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue(null)

    await deleteRecipe('recipe-other')

    expect(mockRecipeDelete).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('自分のレシピの場合: prisma.recipe.delete を呼び / にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })
    mockRecipeDelete.mockResolvedValue({})

    await deleteRecipe('recipe-1')

    expect(mockRecipeFindFirst).toHaveBeenCalledWith({
      where: { id: 'recipe-1', userId: 'user-1' },
    })
    expect(mockRecipeDelete).toHaveBeenCalledWith({ where: { id: 'recipe-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
