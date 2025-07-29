"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const { currentUser } = useAuth()

  // Si es empleado, solo mostrar punto de venta
  if (currentUser?.role === "employee") {
    return (
      <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
        <Link
          href="/pos"
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === "/pos" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Punto de Venta
        </Link>
      </nav>
    )
  }

  // Navegación completa para administradores
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Dashboard
      </Link>
      <Link
        href="/productos"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname?.startsWith("/productos") ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Productos
      </Link>
      <Link
        href="/categorias"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/categorias" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Categorías
      </Link>
      <Link
        href="/empleados"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/empleados" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Empleados
      </Link>
      <Link
        href="/pos"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/pos" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Punto de Venta
      </Link>
      <Link
        href="/facturas"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname?.startsWith("/facturas") ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Facturas
      </Link>
      <Link
        href="/configuraciones"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/configuraciones" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Configuraciones
      </Link>
    </nav>
  )
}
