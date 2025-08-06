"use client"

import { CategoryForm } from "@/components/category-form"
import { RoleGuard } from "@/components/auth/role-guard"

export default function NuevaCategoriaPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]} fallbackMessage="Solo los administradores pueden crear categorías">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Nueva Categoría</h2>
        </div>
        <CategoryForm />
      </div>
    </RoleGuard>
  )
}
