"use client"

import * as React from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter, usePathname } from "next/navigation"

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { initialize, isAuthenticated, isLoading, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    const initAuth = async () => {
      await initialize()
      setIsInitialized(true)
    }
    initAuth()
  }, [initialize])

  React.useEffect(() => {
    if (!isInitialized || isLoading) return

    const publicPaths = ["/login", "/registro", "/recuperar-password"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!isAuthenticated && !isPublicPath) {
      router.push("/login")
    } else if (isAuthenticated && isPublicPath) {
      // Redirigir según el rol del usuario
      if (user?.role === "EMPLOYEE") {
        router.push("/pos")
      } else {
        router.push("/")
      }
    }
  }, [isAuthenticated, isInitialized, isLoading, pathname, router, user])

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <>{children}</>
}
