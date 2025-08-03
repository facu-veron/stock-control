"use client"

// Este componente ha sido refactorizado para usar directamente el store de Zustand
// y evitar la duplicación de lógica de estado. El AuthContext ya no es necesario.

import type * as React from "react"
import { useAuthStore } from "@/stores/auth-store"

/**
 * El AuthProvider ahora solo actúa como un componente de paso.
 * La lógica de estado de autenticación reside completamente en el store de Zustand.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * El hook useAuth ahora es un alias directo para useAuthStore.
 * Esto garantiza una única fuente de verdad para el estado de autenticación
 * en toda la aplicación.
 */
export const useAuth = useAuthStore
