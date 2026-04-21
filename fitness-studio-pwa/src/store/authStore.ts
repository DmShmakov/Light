import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isTrainer: boolean

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
  isTrainer: false,

  setUser: (user) => {
    const isAdmin = user?.roles.includes('admin') ?? false
    const isTrainer = user?.roles.includes('trainer') ?? false
    set({ user, isAdmin, isTrainer, loading: false })
  },

  setLoading: (loading) => set({ loading }),

  checkAdminRole: () => {
    const { user } = get()
    return user?.roles.includes('admin') ?? false
  },

  logout: () => {
    set({ user: null, isAdmin: false, isTrainer: false, loading: false })
  },
}))
