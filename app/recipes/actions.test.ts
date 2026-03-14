import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockRecipeCreate,
  mockRecipeUpdate,
  mockCategoryUpsert,
  mockRecipeDelete,
  mockRecipeFindFirst,
  mockIngredientDeleteMany,
  mockStepDeleteMany,
  mockRecipeCategoryDeleteMany,
  mockIngredientCreateMany,
  mockStepCreateMany,
  mockRecipeCategoryCreateMany,
  mockTransaction,
  mockRedirect,
  mockStorageRemove,
  mockStorageUpload,
  mockStorageGetPublicUrl,
  mockMealRecordCreate,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRecipeCreate: vi.fn(),
  mockRecipeUpdate: vi.fn(),
  mockCategoryUpsert: vi.fn(),
  mockRecipeDelete: vi.fn(),
  mockRecipeFindFirst: vi.fn(),
  mockIngredientDeleteMany: vi.fn(),
  mockStepDeleteMany: vi.fn(),
  mockRecipeCategoryDeleteMany: vi.fn(),
  mockIngredientCreateMany: vi.fn(),
  mockStepCreateMany: vi.fn(),
  mockRecipeCategoryCreateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockRedirect: vi.fn(),
  mockStorageRemove: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockStorageGetPublicUrl: vi.fn(),
  mockMealRecordCreate: vi.fn(),
}))

vi.mock('../utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    storage: {
      from: vi.fn().mockReturnValue({
        remove: mockStorageRemove,
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      }),
    },
  }),
}))

vi.mock('../../lib/prisma', () => ({
  prisma: {
    recipe: { create: mockRecipeCreate, update: mockRecipeUpdate, delete: mockRecipeDelete, findFirst: mockRecipeFindFirst },
    category: { upsert: mockCategoryUpsert },
    ingredient: { deleteMany: mockIngredientDeleteMany, createMany: mockIngredientCreateMany },
    step: { deleteMany: mockStepDeleteMany, createMany: mockStepCreateMany },
    recipeCategory: { deleteMany: mockRecipeCategoryDeleteMany, createMany: mockRecipeCategoryCreateMany },
    mealRecord: { create: mockMealRecordCreate },
    $transaction: mockTransaction,
  },
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image')),
  }),
}))

import { createRecipe, deleteRecipe, updateRecipe } from './actions'

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

  it('外部imageUrlのfetchが失敗した場合: imageUrlがnullになる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false } as Response)

    await createRecipe({ ...baseInput, imageUrl: 'https://example.com/photo.jpg', sourceType: 'url', sourceUrl: 'https://example.com/recipe' })

    // fetch失敗時はimageUrlがnullになるが、sourceTypeはurlのまま
    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: null,
          sourceType: 'url',
        }),
      })
    )
  })

  it('外部imageUrlのバケット保存が成功した場合: バケットURLとsourceType photoで保存される', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response)
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/recipe-images/url-imports/user-1/uuid.jpg' },
    })

    await createRecipe({ ...baseInput, imageUrl: 'https://example.com/photo.jpg' })

    expect(mockStorageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^url-imports\/user-1\/.+\.jpg$/),
      expect.anything(),
      expect.anything()
    )
    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: 'https://project.supabase.co/storage/v1/object/public/recipe-images/url-imports/user-1/uuid.jpg',
          sourceType: 'photo',
        }),
      })
    )
  })

  it('imageUrl が未指定の場合: sourceType が manual、imageUrl が null になる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe(baseInput)

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: null,
          sourceType: 'manual',
        }),
      })
    )
  })

  it('sourceType が url の場合: sourceType が url、sourceUrl が渡される', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe({ ...baseInput, sourceType: 'url', sourceUrl: 'https://example.com/recipe' })

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: 'url',
          sourceUrl: 'https://example.com/recipe',
        }),
      })
    )
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

  it('from が /calendar/YYYY-MM-DD パターンの場合: MealRecord(cooked)を作成してそのパスにリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })
    mockMealRecordCreate.mockResolvedValue({})

    await createRecipe(baseInput, '/calendar/2026-03-14')

    expect(mockMealRecordCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        recipeId: 'recipe-abc',
        date: new Date('2026-03-14'),
        type: 'cooked',
        mealTime: null,
      },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/calendar/2026-03-14')
  })

  it('from が undefined の場合: MealRecordを作成せず / にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe(baseInput, undefined)

    expect(mockMealRecordCreate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('from が https://evil.com の場合: MealRecordを作成せず / にリダイレクトする（オープンリダイレクト防止）', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe(baseInput, 'https://evil.com')

    expect(mockMealRecordCreate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('from が /recipes の場合: MealRecordを作成せず / にリダイレクトする（不正パス）', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeCreate.mockResolvedValue({ id: 'recipe-abc' })

    await createRecipe(baseInput, '/recipes')

    expect(mockMealRecordCreate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})

describe('updateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (queries: Promise<unknown>[]) => Promise.all(queries))
    mockIngredientDeleteMany.mockResolvedValue({})
    mockStepDeleteMany.mockResolvedValue({})
    mockRecipeCategoryDeleteMany.mockResolvedValue({})
    mockRecipeUpdate.mockResolvedValue({ id: 'recipe-1' })
    mockIngredientCreateMany.mockResolvedValue({})
    mockStepCreateMany.mockResolvedValue({})
    mockRecipeCategoryCreateMany.mockResolvedValue({})
  })

  it('未認証の場合: /login にリダイレクトし $transaction を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await updateRecipe('recipe-1', baseInput)

    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('他人のレシピの場合: / にリダイレクトし $transaction を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue(null)

    await updateRecipe('recipe-other', baseInput)

    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('成功時: $transaction を呼び /recipes/recipe-1 にリダイレクトする', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', baseInput)

    expect(mockTransaction).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/recipes/recipe-1')
  })

  it('servings・cookTime が数値文字列の場合: parseInt して update に渡す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', { ...baseInput, servings: '4', cookTime: '30' })

    expect(mockRecipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ servings: 4, cookTime: 30 }),
      })
    )
  })

  it('servings・cookTime が空文字の場合: null を update に渡す', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', { ...baseInput, servings: '', cookTime: '' })

    expect(mockRecipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ servings: null, cookTime: null }),
      })
    )
  })

  it('name が空の材料はフィルタリングされる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', {
      ...baseInput,
      ingredients: [
        { name: 'じゃがいも', amount: '2', unit: '個' },
        { name: '  ', amount: '', unit: '' },
      ],
    })

    expect(mockIngredientCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ name: 'じゃがいも' })]),
      })
    )
    const createCall = mockIngredientCreateMany.mock.calls[0][0]
    expect(createCall.data).toHaveLength(1)
  })

  it('description が空の手順はフィルタリングされる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', {
      ...baseInput,
      steps: [{ description: '具材を炒める' }, { description: '' }],
    })

    expect(mockStepCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ description: '具材を炒める' })]),
      })
    )
    const createCall = mockStepCreateMany.mock.calls[0][0]
    expect(createCall.data).toHaveLength(1)
  })

  it('imageUrl が渡された場合: sourceType が photo になる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', { ...baseInput, imageUrl: 'https://example.com/photo.jpg' })

    expect(mockRecipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: 'https://example.com/photo.jpg',
          sourceType: 'photo',
        }),
      })
    )
  })

  it('imageUrl が未指定の場合: sourceType が manual、imageUrl が null になる', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })

    await updateRecipe('recipe-1', baseInput)

    expect(mockRecipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: null,
          sourceType: 'manual',
        }),
      })
    )
  })

  it('カテゴリがある場合: prisma.category.upsert を呼ぶ', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })
    mockCategoryUpsert
      .mockResolvedValueOnce({ id: 'cat-1' })
      .mockResolvedValueOnce({ id: 'cat-2' })

    await updateRecipe('recipe-1', { ...baseInput, categories: ['和食', '夕食'] })

    expect(mockCategoryUpsert).toHaveBeenCalledTimes(2)
    expect(mockRecipeCategoryCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { recipeId: 'recipe-1', categoryId: 'cat-1' },
          { recipeId: 'recipe-1', categoryId: 'cat-2' },
        ],
      })
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
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1', imageUrl: null })
    mockRecipeDelete.mockResolvedValue({})

    await deleteRecipe('recipe-1')

    expect(mockRecipeFindFirst).toHaveBeenCalledWith({
      where: { id: 'recipe-1', userId: 'user-1' },
    })
    expect(mockRecipeDelete).toHaveBeenCalledWith({ where: { id: 'recipe-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('imageUrl がある場合: Storage からファイルを削除する', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({
      id: 'recipe-1',
      userId: 'user-1',
      imageUrl: 'https://example.supabase.co/storage/v1/object/public/recipe-images/user-1/uuid.jpg',
    })
    mockRecipeDelete.mockResolvedValue({})
    mockStorageRemove.mockResolvedValue({ error: null })

    await deleteRecipe('recipe-1')

    expect(mockStorageRemove).toHaveBeenCalledWith(['user-1/uuid.jpg'])
    expect(mockRecipeDelete).toHaveBeenCalledWith({ where: { id: 'recipe-1' } })
  })

  it('imageUrl がない場合: Storage の削除は呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1', imageUrl: null })
    mockRecipeDelete.mockResolvedValue({})

    await deleteRecipe('recipe-1')

    expect(mockStorageRemove).not.toHaveBeenCalled()
  })

  it('url-imports パスの画像がある場合: バケットから正しいパスで削除する', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({
      id: 'recipe-1',
      userId: 'user-1',
      imageUrl: 'https://project.supabase.co/storage/v1/object/public/recipe-images/url-imports/user-1/uuid.jpg',
    })
    mockRecipeDelete.mockResolvedValue({})
    mockStorageRemove.mockResolvedValue({ error: null })

    await deleteRecipe('recipe-1')

    expect(mockStorageRemove).toHaveBeenCalledWith(['url-imports/user-1/uuid.jpg'])
    expect(mockRecipeDelete).toHaveBeenCalledWith({ where: { id: 'recipe-1' } })
  })
})
