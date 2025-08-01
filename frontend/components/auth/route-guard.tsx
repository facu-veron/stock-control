"use client"

import type * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft, Home, Loader2 } from "lucide-react"

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: ("ADMIN" | "EMPLOYEE")[]
  fallback?: React.ReactNode
}

export function RouteGuard({ children, allowedRoles = ["ADMIN", "EMPLOYEE"], fallback }: RouteGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Verificando autenticación...</span>
        </div>
      </div>
    )
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated || !user) {
    router.push("/login")
    return null
  }

  // Verificar permisos de rol
  if (!allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta página.
              {user.role === "EMPLOYEE" && " Los empleados solo pueden acceder al punto de venta."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.role === "EMPLOYEE" && (
              <Button onClick={() => router.push("/pos")} className="w-full" variant="default">
                <Home className="h-4 w-4 mr-2" />
                Ir al Punto de Venta
              </Button>
            )}
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
