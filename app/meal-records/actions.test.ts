import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockMealRecordCreate,
  mockMealRecordDelete,
  mockMealRecordFindFirst,
  mockRecipeFindFirst,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockMealRecordCreate: vi.fn(),
  mockMealRecordDelete: vi.fn(),
  mockMealRecordFindFirst: vi.fn(),
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
    mealRecord: {
      create: mockMealRecordCreate,
      delete: mockMealRecordDelete,
      findFirst: mockMealRecordFindFirst,
    },
    recipe: { findFirst: mockRecipeFindFirst },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { createMealRecord, deleteMealRecord } from './actions'

describe('createMealRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('未認証の場合: /login にリダイレクトし create を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await createMealRecord({ recipeId: 'recipe-1', date: '2026-03-01' })

    expect(mockMealRecordCreate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('他人のレシピIDの場合: create を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue(null)

    await createMealRecord({ recipeId: 'recipe-other', date: '2026-03-01' })

    expect(mockMealRecordCreate).not.toHaveBeenCalled()
  })

  it('成功時: create を正しい引数で呼ぶ', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })
    mockMealRecordCreate.mockResolvedValue({ id: 'meal-1' })

    await createMealRecord({ recipeId: 'recipe-1', date: '2026-03-01' })

    expect(mockMealRecordCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        recipeId: 'recipe-1',
        date: new Date('2026-03-01'),
      },
    })
  })

  it('date 文字列が Date オブジェクトに変換される', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRecipeFindFirst.mockResolvedValue({ id: 'recipe-1', userId: 'user-1' })
    mockMealRecordCreate.mockResolvedValue({ id: 'meal-1' })

    await createMealRecord({ recipeId: 'recipe-1', date: '2026-03-09' })

    const call = mockMealRecordCreate.mock.calls[0][0]
    expect(call.data.date).toBeInstanceOf(Date)
    expect(call.data.date).toEqual(new Date('2026-03-09'))
  })
})

describe('deleteMealRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('未認証の場合: /login にリダイレクトし delete を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await deleteMealRecord('meal-1')

    expect(mockMealRecordDelete).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('他人のレコードの場合: delete を呼ばない', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMealRecordFindFirst.mockResolvedValue(null)

    await deleteMealRecord('meal-other')

    expect(mockMealRecordDelete).not.toHaveBeenCalled()
  })

  it('成功時: delete を呼ぶ', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMealRecordFindFirst.mockResolvedValue({ id: 'meal-1', userId: 'user-1' })
    mockMealRecordDelete.mockResolvedValue({})

    await deleteMealRecord('meal-1')

    expect(mockMealRecordFindFirst).toHaveBeenCalledWith({
      where: { id: 'meal-1', userId: 'user-1' },
    })
    expect(mockMealRecordDelete).toHaveBeenCalledWith({ where: { id: 'meal-1' } })
  })
})
