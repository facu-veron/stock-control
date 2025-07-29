"use client"

import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { ProductForm } from "@/components/product-form"
import { RoleGuard } from "@/components/auth/role-guard"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NuevoProductoPage() {
  const { currentUser } = useAuth()

  return (
    <RoleGuard
      allowedRoles={["admin"]}
      currentUser={currentUser}
      fallbackMessage="Solo los administradores pueden crear artículos"
    >
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center space-y-2">
            <Button variant="outline" size="sm" className="mr-4 bg-transparent">
              <Link href="/productos" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Nuevo Artículo</h2>
          </div>
          <div className="grid gap-4">
            <ProductForm />
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
