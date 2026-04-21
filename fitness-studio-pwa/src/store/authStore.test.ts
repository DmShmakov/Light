import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import type { User } from '../types'

function makeUser(roles: string[]): User {
  return {
    uid: 'user1',
    name: 'Test User',
    email: 'test@test.com',
    phone: '+79990000000',
    photoUrl: null,
    roles: roles as User['roles'],
    createdAt: new Date(),
  }
}

describe('authStore — isTrainer', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('isTrainer is false by default', () => {
    expect(useAuthStore.getState().isTrainer).toBe(false)
  })

  it('isAdmin is false by default', () => {
    expect(useAuthStore.getState().isAdmin).toBe(false)
  })

  it('isTrainer is false for client-only role', () => {
    useAuthStore.getState().setUser(makeUser(['client']))
    expect(useAuthStore.getState().isTrainer).toBe(false)
  })

  it('isTrainer is true when user has trainer role', () => {
    useAuthStore.getState().setUser(makeUser(['trainer']))
    expect(useAuthStore.getState().isTrainer).toBe(true)
  })

  it('isTrainer is true for client + trainer combination', () => {
    useAuthStore.getState().setUser(makeUser(['client', 'trainer']))
    expect(useAuthStore.getState().isTrainer).toBe(true)
  })

  it('isTrainer and isAdmin are both true for admin + trainer', () => {
    useAuthStore.getState().setUser(makeUser(['admin', 'trainer']))
    expect(useAuthStore.getState().isTrainer).toBe(true)
    expect(useAuthStore.getState().isAdmin).toBe(true)
  })

  it('isAdmin does not imply isTrainer', () => {
    useAuthStore.getState().setUser(makeUser(['admin']))
    expect(useAuthStore.getState().isAdmin).toBe(true)
    expect(useAuthStore.getState().isTrainer).toBe(false)
  })

  it('isTrainer does not imply isAdmin', () => {
    useAuthStore.getState().setUser(makeUser(['trainer']))
    expect(useAuthStore.getState().isAdmin).toBe(false)
    expect(useAuthStore.getState().isTrainer).toBe(true)
  })

  it('isTrainer is reset to false on logout', () => {
    useAuthStore.getState().setUser(makeUser(['trainer']))
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isTrainer).toBe(false)
  })

  it('isAdmin is reset to false on logout', () => {
    useAuthStore.getState().setUser(makeUser(['admin']))
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAdmin).toBe(false)
  })

  it('user is null after logout', () => {
    useAuthStore.getState().setUser(makeUser(['trainer']))
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('isTrainer updates when user is replaced', () => {
    useAuthStore.getState().setUser(makeUser(['client']))
    expect(useAuthStore.getState().isTrainer).toBe(false)

    useAuthStore.getState().setUser(makeUser(['trainer']))
    expect(useAuthStore.getState().isTrainer).toBe(true)
  })

  it('setUser(null) resets isTrainer', () => {
    useAuthStore.getState().setUser(makeUser(['trainer']))
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().isTrainer).toBe(false)
  })
})
