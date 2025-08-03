"use client"

import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { CategoriesTable } from "@/components/categories-table"
import { RoleGuard } from "@/components/auth/role-guard"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function CategoriasPage() {
  // const { currentUser } = useAuth() // Removed as per updates

  return (
    <RoleGuard allowedRoles={["admin"]} fallbackMessage="Solo los administradores pueden gestionar categorías">
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
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
            <div className="flex items-center space-x-2">
              <Button asChild>
                <Link href="/categorias/nueva" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Categoría
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <CategoriesTable />
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
