import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkSubscriptionForClass,
  getCurrentUserSubscription,
  incrementSubscriptionVisit,
  decrementSubscriptionVisit,
  createUserSubscription,
} from './subscriptionService'
import type { UserSubscription, SubscriptionPlan } from '../types'
import { getDocs, getDoc, updateDoc, addDoc } from 'firebase/firestore'

// ── Firestore mock ────────────────────────────────────────────────────────────

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args: unknown[]) => args[0]),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  serverTimestamp: vi.fn(() => new Date('2026-04-21')),
  increment: (n: number) => ({ _op: 'increment', value: n }),
  arrayUnion: (...values: string[]) => ({ _op: 'arrayUnion', values }),
  arrayRemove: (...values: string[]) => ({ _op: 'arrayRemove', values }),
}))

vi.mock('./firebase', () => ({ db: {} }))

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => ({
      createdAt: { toDate: () => new Date('2026-01-01') },
      updatedAt: { toDate: () => new Date('2026-01-01') },
      ...data,
    }),
  }
}

function makeQuerySnap(docs: ReturnType<typeof makeDoc>[]) {
  return { empty: docs.length === 0, docs }
}

function makeDocSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return { exists: () => exists, data: () => data }
}

/** Subscription document fields (flat, as stored in Firestore) */
function subFields(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    userId: 'user1',
    status: 'active',
    planId: 'plan1',
    planName: '8 занятий',
    visitsTotal: 8,
    visitsUsed: 3,
    durationDays: 60,
    startDate: null,
    expiresAt: null,
    enrolledClassIds: [],
    ...overrides,
  }
}

/** In-memory UserSubscription object */
function makeSub(overrides: Partial<UserSubscription> = {}): UserSubscription {
  return {
    subscriptionId: 'sub1',
    userId: 'user1',
    userName: 'Test',
    userEmail: 'test@test.com',
    planId: 'plan1',
    planName: '8 занятий',
    visitsTotal: 8,
    visitsUsed: 3,
    durationDays: 60,
    startDate: new Date('2026-01-01'),
    expiresAt: new Date('2026-12-31'),
    status: 'active',
    enrolledClassIds: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makePlan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    planId: 'plan1',
    name: '8 занятий',
    description: '',
    visitsCount: 8,
    durationDays: 60,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkSubscriptionForClass — pure function, no Firebase dependency
// ─────────────────────────────────────────────────────────────────────────────

describe('checkSubscriptionForClass', () => {
  // A class date that sits comfortably within the default subscription range
  const validDate = new Date('2026-06-15')

  it('returns invalid when subscription is null', () => {
    const r = checkSubscriptionForClass(null, validDate)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('Нет абонемента')
  })

  it('returns invalid when status is unpaid', () => {
    const r = checkSubscriptionForClass(makeSub({ status: 'unpaid' }), validDate)
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('Абонемент не оплачен')
  })

  it('returns invalid when status is expired', () => {
    const r = checkSubscriptionForClass(makeSub({ status: 'expired' }), validDate)
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/истёк/)
  })

  it('returns invalid when status is exhausted', () => {
    const r = checkSubscriptionForClass(makeSub({ status: 'exhausted' }), validDate)
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/исчерпаны/)
  })

  it('returns invalid when expiresAt is in the past — runtime expiry check', () => {
    const r = checkSubscriptionForClass(
      makeSub({ expiresAt: new Date('2020-01-01') }),
      validDate
    )
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/истёк/)
  })

  it('returns invalid when classDate is before startDate', () => {
    const r = checkSubscriptionForClass(
      makeSub({ startDate: new Date('2026-07-01') }),
      new Date('2026-06-01')
    )
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('Занятие до начала абонемента')
  })

  it('returns invalid when classDate is after expiresAt', () => {
    const r = checkSubscriptionForClass(
      makeSub({ expiresAt: new Date('2026-05-01') }),
      new Date('2026-06-15')
    )
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('Занятие вне срока абонемента')
  })

  it('returns invalid when visitsUsed equals visitsTotal', () => {
    const r = checkSubscriptionForClass(
      makeSub({ visitsUsed: 8, visitsTotal: 8 }),
      validDate
    )
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/исчерпаны/)
  })

  it('returns invalid when visitsUsed exceeds visitsTotal', () => {
    const r = checkSubscriptionForClass(
      makeSub({ visitsUsed: 9, visitsTotal: 8 }),
      validDate
    )
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/исчерпаны/)
  })

  it('returns valid for a subscription with remaining visits and valid dates', () => {
    const r = checkSubscriptionForClass(makeSub(), validDate)
    expect(r.valid).toBe(true)
    expect(r.reason).toBe('')
  })

  it('returns valid when exactly one visit remains', () => {
    const r = checkSubscriptionForClass(makeSub({ visitsUsed: 7, visitsTotal: 8 }), validDate)
    expect(r.valid).toBe(true)
  })

  it('returns valid when visitsTotal is null — unlimited visits', () => {
    const r = checkSubscriptionForClass(
      makeSub({ visitsTotal: null, visitsUsed: 999 }),
      validDate
    )
    expect(r.valid).toBe(true)
  })

  it('returns valid when expiresAt is null — no time limit', () => {
    const r = checkSubscriptionForClass(
      makeSub({ expiresAt: null, durationDays: null }),
      new Date('2035-01-01')
    )
    expect(r.valid).toBe(true)
  })

  it('returns valid when startDate is null — no start restriction', () => {
    const r = checkSubscriptionForClass(
      makeSub({ startDate: null }),
      new Date('2025-01-01')
    )
    expect(r.valid).toBe(true)
  })

  it('classDate exactly equals expiresAt — still valid (boundary)', () => {
    const boundary = new Date('2026-12-31')
    const r = checkSubscriptionForClass(makeSub({ expiresAt: boundary }), boundary)
    expect(r.valid).toBe(true)
  })

  it('classDate exactly equals startDate — still valid (boundary)', () => {
    const boundary = new Date('2026-01-01')
    const r = checkSubscriptionForClass(makeSub({ startDate: boundary }), boundary)
    expect(r.valid).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentUserSubscription — priority logic + composite-index-free query
// ─────────────────────────────────────────────────────────────────────────────

describe('getCurrentUserSubscription', () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset()
  })

  it('returns null when no subscriptions exist', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    expect(await getCurrentUserSubscription('user1')).toBeNull()
  })

  it('returns null when only expired subscription exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'expired' }))]) as any
    )
    expect(await getCurrentUserSubscription('user1')).toBeNull()
  })

  it('returns active subscription', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'active' }))]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('active')
    expect(result?.subscriptionId).toBe('s1')
  })

  it('returns unpaid subscription when no active exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'unpaid' }))]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('unpaid')
  })

  it('returns exhausted subscription when no active or unpaid exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'exhausted', visitsUsed: 8 }))]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('exhausted')
  })

  it('prioritizes active over unpaid', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeDoc('s-unpaid', subFields({ status: 'unpaid' })),
        makeDoc('s-active', subFields({ status: 'active' })),
      ]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('active')
    expect(result?.subscriptionId).toBe('s-active')
  })

  it('prioritizes active over exhausted', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeDoc('s-exhausted', subFields({ status: 'exhausted', visitsUsed: 8 })),
        makeDoc('s-active', subFields({ status: 'active' })),
      ]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('active')
  })

  it('prioritizes unpaid over exhausted', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeDoc('s-exhausted', subFields({ status: 'exhausted', visitsUsed: 8 })),
        makeDoc('s-unpaid', subFields({ status: 'unpaid' })),
      ]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('unpaid')
  })

  it('ignores expired when active also present', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([
        makeDoc('s-expired', subFields({ status: 'expired' })),
        makeDoc('s-active', subFields({ status: 'active' })),
      ]) as any
    )
    const result = await getCurrentUserSubscription('user1')
    expect(result?.status).toBe('active')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// incrementSubscriptionVisit
// ─────────────────────────────────────────────────────────────────────────────

describe('incrementSubscriptionVisit', () => {
  beforeEach(() => {
    vi.mocked(getDoc).mockReset()
    vi.mocked(updateDoc).mockReset().mockResolvedValue(undefined as any)
  })

  it('does nothing when subscription doc does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue(makeDocSnap(false) as any)
    await incrementSubscriptionVisit('sub1', 'class1')
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('increments visitsUsed and adds classId to enrolledClassIds', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 3, visitsTotal: 8, status: 'active' }) as any
    )
    await incrementSubscriptionVisit('sub1', 'class1')
    expect(updateDoc).toHaveBeenCalledOnce()
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.visitsUsed).toEqual({ _op: 'increment', value: 1 })
    expect(update.enrolledClassIds).toEqual({ _op: 'arrayUnion', values: ['class1'] })
  })

  it('does not set status: exhausted when visits remain', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 3, visitsTotal: 8, status: 'active' }) as any
    )
    await incrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })

  it('sets status: exhausted when last visit is used', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 7, visitsTotal: 8, status: 'active' }) as any
    )
    await incrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBe('exhausted')
  })

  it('sets exhausted on single-visit subscription', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 0, visitsTotal: 1, status: 'active' }) as any
    )
    await incrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBe('exhausted')
  })

  it('never sets exhausted for unlimited subscriptions (visitsTotal null)', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 999, visitsTotal: null, status: 'active' }) as any
    )
    await incrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// decrementSubscriptionVisit
// ─────────────────────────────────────────────────────────────────────────────

describe('decrementSubscriptionVisit', () => {
  const futureExpiry = { toDate: () => new Date('2026-12-31') }
  const pastExpiry   = { toDate: () => new Date('2020-01-01') }

  beforeEach(() => {
    vi.mocked(getDoc).mockReset()
    vi.mocked(updateDoc).mockReset().mockResolvedValue(undefined as any)
  })

  it('does nothing when subscription doc does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue(makeDocSnap(false) as any)
    await decrementSubscriptionVisit('sub1', 'class1')
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('decrements visitsUsed and removes classId from enrolledClassIds', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 3, visitsTotal: 8, status: 'active', expiresAt: null }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    expect(updateDoc).toHaveBeenCalledOnce()
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.visitsUsed).toEqual({ _op: 'increment', value: -1 })
    expect(update.enrolledClassIds).toEqual({ _op: 'arrayRemove', values: ['class1'] })
  })

  it('does not change status for an active subscription', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 3, visitsTotal: 8, status: 'active', expiresAt: null }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })

  it('restores active from exhausted when decrement brings visitsUsed below total — future expiry', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 8, visitsTotal: 8, status: 'exhausted', expiresAt: futureExpiry }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBe('active')
  })

  it('restores active from exhausted when expiresAt is null — no time limit', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 8, visitsTotal: 8, status: 'exhausted', expiresAt: null }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBe('active')
  })

  it('does NOT restore active when expiresAt is in the past', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 8, visitsTotal: 8, status: 'exhausted', expiresAt: pastExpiry }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })

  it('does NOT restore active when newVisitsUsed still equals visitsTotal', async () => {
    // visitsUsed=9 (over-issued), total=8 → after decrement: max(0, 9-1)=8, 8 < 8 is false
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 9, visitsTotal: 8, status: 'exhausted', expiresAt: futureExpiry }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })

  it('does NOT restore active for unlimited subscriptions (visitsTotal null) — no exhaustion possible', async () => {
    vi.mocked(getDoc).mockResolvedValue(
      makeDocSnap(true, { visitsUsed: 3, visitsTotal: null, status: 'active', expiresAt: null }) as any
    )
    await decrementSubscriptionVisit('sub1', 'class1')
    const update = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>
    expect(update.status).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createUserSubscription — block logic (our bug fix: exhausted should NOT block)
// ─────────────────────────────────────────────────────────────────────────────

describe('createUserSubscription — existing subscription guard', () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset()
    vi.mocked(addDoc).mockReset().mockResolvedValue({ id: 'newSub' } as any)
  })

  it('throws when an active subscription already exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'active' }))]) as any
    )
    await expect(
      createUserSubscription('user1', 'Test', 'test@test.com', makePlan(), new Date())
    ).rejects.toThrow(/активный абонемент/)
  })

  it('throws when an unpaid subscription already exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'unpaid' }))]) as any
    )
    await expect(
      createUserSubscription('user1', 'Test', 'test@test.com', makePlan(), new Date())
    ).rejects.toThrow(/активный абонемент/)
  })

  it('allows creating a new subscription when only exhausted one exists', async () => {
    vi.mocked(getDocs).mockResolvedValue(
      makeQuerySnap([makeDoc('s1', subFields({ status: 'exhausted', visitsUsed: 8 }))]) as any
    )
    await expect(
      createUserSubscription('user1', 'Test', 'test@test.com', makePlan(), new Date())
    ).resolves.toBe('newSub')
    expect(addDoc).toHaveBeenCalledOnce()
  })

  it('allows creating a new subscription when no subscriptions exist', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    await expect(
      createUserSubscription('user1', 'Test', 'test@test.com', makePlan(), new Date())
    ).resolves.toBe('newSub')
    expect(addDoc).toHaveBeenCalledOnce()
  })

  it('computes expiresAt from startDate + durationDays', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    const startDate = new Date('2026-05-01')
    await createUserSubscription('user1', 'Test', 'test@test.com', makePlan({ durationDays: 60 }), startDate)
    const docData = vi.mocked(addDoc).mock.calls[0][1] as Record<string, any>
    // expiresAt.toDate() should be startDate + 60 days
    const expectedExpiry = new Date('2026-05-01')
    expectedExpiry.setDate(expectedExpiry.getDate() + 60)
    expect(docData.expiresAt.toDate()).toEqual(expectedExpiry)
  })

  it('sets expiresAt to null for a plan with no durationDays', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    await createUserSubscription(
      'user1', 'Test', 'test@test.com',
      makePlan({ durationDays: null }),
      new Date()
    )
    const docData = vi.mocked(addDoc).mock.calls[0][1] as Record<string, any>
    expect(docData.expiresAt).toBeNull()
  })

  it('creates subscription with status unpaid', async () => {
    vi.mocked(getDocs).mockResolvedValue(makeQuerySnap([]) as any)
    await createUserSubscription('user1', 'Test', 'test@test.com', makePlan(), new Date())
    const docData = vi.mocked(addDoc).mock.calls[0][1] as Record<string, any>
    expect(docData.status).toBe('unpaid')
    expect(docData.visitsUsed).toBe(0)
    expect(docData.enrolledClassIds).toEqual([])
  })
})
