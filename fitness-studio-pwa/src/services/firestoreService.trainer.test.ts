import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTrainerClasses, getUsersWithRole, toggleUserRole } from './firestoreService'
import { getDocs, updateDoc } from 'firebase/firestore'

// ── Firestore mock ────────────────────────────────────────────────────────────

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args: unknown[]) => args[0]),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  addDoc: vi.fn().mockResolvedValue({ id: 'newId' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  serverTimestamp: vi.fn(() => new Date()),
  arrayUnion: (...values: string[]) => ({ _op: 'arrayUnion', values }),
  arrayRemove: (...values: string[]) => ({ _op: 'arrayRemove', values }),
}))

vi.mock('./firebase', () => ({ db: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTimestamp(date: Date) {
  return { toDate: () => date }
}

function makeClassDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      title: 'Йога',
      type: 'yoga',
      trainerId: 'trainer1',
      trainerName: 'Иван Иванов',
      startDateTime: makeTimestamp(new Date('2026-04-22T10:00:00')),
      endDateTime: makeTimestamp(new Date('2026-04-22T11:00:00')),
      maxParticipants: 15,
      description: 'Описание',
      level: 'beginner',
      status: 'scheduled',
      createdAt: makeTimestamp(new Date('2026-01-01')),
      ...overrides,
    }),
  }
}

function makeUserDoc(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: () => ({
      name: 'Test Trainer',
      email: 'trainer@test.com',
      phone: '+79990000000',
      photoUrl: null,
      roles: ['trainer'],
      createdAt: makeTimestamp(new Date('2026-01-01')),
      ...overrides,
    }),
  }
}

function makeQuerySnap(docs: ReturnType<typeof makeClassDoc>[]) {
  return { empty: docs.length === 0, docs }
}

// ── getTrainerClasses ─────────────────────────────────────────────────────────

describe('getTrainerClasses', () => {
  beforeEach(() => vi.mocked(getDocs).mockReset())

  it('returns empty array when no classes found', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    const result = await getTrainerClasses('trainer1', new Date(), new Date())
    expect(result).toEqual([])
  })

  it('maps Firestore document to FitnessClass', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeClassDoc('class1')]) as any
    )
    const result = await getTrainerClasses('trainer1', new Date(), new Date())
    expect(result).toHaveLength(1)
    expect(result[0].classId).toBe('class1')
    expect(result[0].title).toBe('Йога')
    expect(result[0].trainerId).toBe('trainer1')
  })

  it('converts Timestamp fields to Date', async () => {
    const startDate = new Date('2026-04-22T10:00:00')
    const endDate = new Date('2026-04-22T11:00:00')
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeClassDoc('class1', {
          startDateTime: makeTimestamp(startDate),
          endDateTime: makeTimestamp(endDate),
        }),
      ]) as any
    )
    const result = await getTrainerClasses('trainer1', new Date(), new Date())
    expect(result[0].startDateTime).toEqual(startDate)
    expect(result[0].endDateTime).toEqual(endDate)
  })

  it('returns all classes in the result', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeClassDoc('class1', { title: 'Йога' }),
        makeClassDoc('class2', { title: 'Пилатес' }),
        makeClassDoc('class3', { title: 'Стретчинг' }),
      ]) as any
    )
    const result = await getTrainerClasses('trainer1', new Date(), new Date())
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.title)).toEqual(['Йога', 'Пилатес', 'Стретчинг'])
  })

  it('uses createdAt fallback when field is missing', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeClassDoc('class1', { createdAt: undefined })]) as any
    )
    const result = await getTrainerClasses('trainer1', new Date(), new Date())
    expect(result[0].createdAt).toBeInstanceOf(Date)
  })
})

// ── getUsersWithRole ──────────────────────────────────────────────────────────

describe('getUsersWithRole', () => {
  beforeEach(() => vi.mocked(getDocs).mockReset())

  it('returns empty array when no users found', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    const result = await getUsersWithRole('trainer')
    expect(result).toEqual([])
  })

  it('maps Firestore document to User', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeUserDoc('user1')]) as any
    )
    const result = await getUsersWithRole('trainer')
    expect(result).toHaveLength(1)
    expect(result[0].uid).toBe('user1')
    expect(result[0].name).toBe('Test Trainer')
    expect(result[0].roles).toContain('trainer')
  })

  it('returns multiple users', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeUserDoc('user1', { name: 'Тренер Один' }),
        makeUserDoc('user2', { name: 'Тренер Два' }),
      ]) as any
    )
    const result = await getUsersWithRole('trainer')
    expect(result).toHaveLength(2)
    expect(result.map((u) => u.name)).toEqual(['Тренер Один', 'Тренер Два'])
  })

  it('converts createdAt Timestamp to Date', async () => {
    const createdAt = new Date('2026-01-15')
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeUserDoc('user1', { createdAt: makeTimestamp(createdAt) })]) as any
    )
    const result = await getUsersWithRole('trainer')
    expect(result[0].createdAt).toEqual(createdAt)
  })

  it('works for any role string, not just trainer', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeUserDoc('admin1', { roles: ['admin'] })]) as any
    )
    const result = await getUsersWithRole('admin')
    expect(result[0].roles).toContain('admin')
  })
})

// ── toggleUserRole ────────────────────────────────────────────────────────────

describe('toggleUserRole', () => {
  beforeEach(() => {
    vi.mocked(updateDoc).mockReset().mockResolvedValue(undefined as any)
  })

  it('calls updateDoc with arrayUnion when active=true', async () => {
    await toggleUserRole('user1', 'trainer', true)
    expect(updateDoc).toHaveBeenCalledOnce()
    const updateArg = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(updateArg.roles).toEqual({ _op: 'arrayUnion', values: ['trainer'] })
  })

  it('calls updateDoc with arrayRemove when active=false', async () => {
    await toggleUserRole('user1', 'trainer', false)
    expect(updateDoc).toHaveBeenCalledOnce()
    const updateArg = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(updateArg.roles).toEqual({ _op: 'arrayRemove', values: ['trainer'] })
  })

  it('works for any role string', async () => {
    await toggleUserRole('user1', 'admin', true)
    const updateArg = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(updateArg.roles).toEqual({ _op: 'arrayUnion', values: ['admin'] })
  })

  it('uses arrayRemove to revoke role', async () => {
    await toggleUserRole('user1', 'admin', false)
    const updateArg = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(updateArg.roles).toEqual({ _op: 'arrayRemove', values: ['admin'] })
  })
})
