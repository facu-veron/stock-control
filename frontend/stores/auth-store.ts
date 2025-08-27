import { create } from "zustand"
import { persist } from "zustand/middleware"
import * as api from "@/lib/api"
import type { User, LoginRequest, RegisterRequest } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  getProfile: () => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })

        try {
          const { user, token } = await api.login(credentials)
          localStorage.setItem("token", token)
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false,
          })
          throw error
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })

        try {
          const { user, token } = await api.register(userData)
          localStorage.setItem("token", token)
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem("token")
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      // Eliminar getProfile y referencias a api.getMe

      initialize: async () => {
        const { token } = get()
        if (token) {
          localStorage.setItem("token", token)
          // await get().getProfile() // This line is removed as per the edit hint
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem("token", state.token)
        }
      },
    },
  ),
)
