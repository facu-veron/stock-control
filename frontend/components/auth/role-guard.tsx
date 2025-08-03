"use client"

import type React from "react"
import { useAuth } from "./auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackMessage?: string
}

export function RoleGuard({
  children,
  allowedRoles,
  fallbackMessage = "No tienes permiso para ver esta página.",
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle>Acceso Requerido</CardTitle>
            <CardDescription>Debes iniciar sesión para acceder a esta página</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/login")} className="w-full">
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userHasRequiredRole = allowedRoles.map((role) => role.toUpperCase()).includes(user.role.toUpperCase())

  if (!userHasRequiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>{fallbackMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => router.push("/pos")} className="w-full" variant="default">
              <Home className="mr-2 h-4 w-4" />
              Ir al Punto de Venta
            </Button>
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
