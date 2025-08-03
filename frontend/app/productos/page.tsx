"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { ProductsTable } from "@/components/products-table"
import { DataTableFacetedFilter } from "@/components/data-table-faceted-filter"
import { RoleGuard } from "@/components/auth/role-guard"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function ProductosPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} fallbackMessage="Solo los administradores pueden gestionar artículos">
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
            <h2 className="text-3xl font-bold tracking-tight">Artículos</h2>
            <div className="flex items-center space-x-2">
              <Button asChild>
                <Link href="/productos/nuevo" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Artículo
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <Input placeholder="Buscar artículos..." className="h-9 w-[250px] lg:w-[300px]" />
                <DataTableFacetedFilter />
              </div>
            </div>
            <ProductsTable />
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
