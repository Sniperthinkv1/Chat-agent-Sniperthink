import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  expiresAt: number | null
  login: (token: string, expiresIn: number) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      expiresAt: null,

      login: (token: string, expiresIn: number) => {
        const expiresAt = Date.now() + expiresIn * 1000
        set({
          token,
          isAuthenticated: true,
          expiresAt,
        })
      },

      logout: () => {
        set({
          token: null,
          isAuthenticated: false,
          expiresAt: null,
        })
      },

      checkAuth: () => {
        const { token, expiresAt } = get()
        if (!token || !expiresAt) {
          return false
        }
        if (Date.now() >= expiresAt) {
          get().logout()
          return false
        }
        return true
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        expiresAt: state.expiresAt,
      }),
    }
  )
)
