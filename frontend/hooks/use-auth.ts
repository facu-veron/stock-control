"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, getProfile, clearError } = useAuthStore()

  // Verificar si hay un token guardado al cargar la aplicación
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token && !isAuthenticated && !isLoading) {
      getProfile()
    }
  }, [isAuthenticated, isLoading, getProfile])

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
