"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } = useAuthStore()

  // Eliminar el useEffect que llama a getProfile y la referencia en el return

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  }
}
