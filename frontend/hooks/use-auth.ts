"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getProfile,
    clearError,
    initialize,
  } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    getProfile,
    clearError,
  }
}
