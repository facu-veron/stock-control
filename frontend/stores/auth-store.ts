import { create } from "zustand"
import { apiClient, type User, type LoginRequest, type RegisterRequest } from "@/lib/api"

interface AuthState {
  user: User | null
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
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.login(credentials)

      if (response.success && response.data) {
        const { user, token } = response.data
        apiClient.setToken(token)
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Login failed")
      }
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
      const response = await apiClient.register(userData)

      if (response.success && response.data) {
        const { user, token } = response.data
        apiClient.setToken(token)
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Registration failed")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Registration failed",
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    apiClient.removeToken()
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  getProfile: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.getProfile()

      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Failed to get profile")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to get profile",
        isLoading: false,
        isAuthenticated: false,
        user: null,
      })
      apiClient.removeToken()
    }
  },

  clearError: () => set({ error: null }),
}))
