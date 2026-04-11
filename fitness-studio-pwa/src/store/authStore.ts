import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  checkAdminRole: () => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAdmin: false,

  setUser: (user) => {
    const isAdmin = user?.roles.includes('admin') ?? false
    set({ user, isAdmin, loading: false })
  },

  setLoading: (loading) => set({ loading }),

  checkAdminRole: () => {
    const { user } = get()
    return user?.roles.includes('admin') ?? false
  },

  logout: () => {
    set({ user: null, isAdmin: false, loading: false })
  },
}))
