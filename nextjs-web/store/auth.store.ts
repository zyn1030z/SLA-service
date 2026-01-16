import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  roleCode?: string
  isActive?: boolean
  isLocked?: boolean
  lastLoginAt?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),

      clearAuth: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
        isLoading: false
      }),

      login: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        error: null,
        isLoading: false
      }),

      logout: () => {
        const { clearAuth } = get()
        clearAuth()
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user, accessToken, and refreshToken
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken
      })
    }
  )
)

// Selectors for common auth checks
export const useAuthSelectors = () => {
  const { user, accessToken, isLoading, error } = useAuthStore()

  return {
    isAuthenticated: !!accessToken,
    isLoading,
    error,
    user,
    isAdmin: user?.role === 'admin' || user?.roleCode === 'admin',
    hasRole: (role: string) => user?.role === role || user?.roleCode === role
  }
}
