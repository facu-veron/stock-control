"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, getProfile, clearError } = useAuthStore()

  // Verificar autenticación al cargar
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token && !user) {
      getProfile()
    }
  }, [user, getProfile])

  return {
    user,
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
