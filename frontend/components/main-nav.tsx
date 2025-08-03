"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { cn } from "@/lib/utils"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  if (!user) {
    return null
  }

  const allRoutes = [
    { href: "/", label: "Dashboard", roles: ["ADMIN"] },
    { href: "/productos", label: "Productos", roles: ["ADMIN"] },
    { href: "/categorias", label: "Categorías", roles: ["ADMIN"] },
    { href: "/facturas", label: "Facturas", roles: ["ADMIN"] },
    { href: "/empleados", label: "Empleados", roles: ["ADMIN"] },
    { href: "/pos", label: "Punto de Venta", roles: ["ADMIN", "EMPLOYEE"] },
    { href: "/configuraciones", label: "Configuraciones", roles: ["ADMIN", "EMPLOYEE"] },
  ]

  const accessibleRoutes = allRoutes.filter((route) => route.roles.includes(user.role))

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      {accessibleRoutes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname.startsWith(route.href) && route.href !== "/"
              ? "text-foreground"
              : pathname === route.href
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
