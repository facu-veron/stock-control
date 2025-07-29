"use client"

import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { EmployeeManagement } from "@/components/employee-management"
import { RoleGuard } from "@/components/auth/role-guard"
import { useAuth } from "@/components/auth/auth-provider"

export default function EmpleadosPage() {
  const { currentUser } = useAuth()

  return (
    <RoleGuard
      allowedRoles={["admin"]}
      currentUser={currentUser}
      fallbackMessage="Solo los administradores pueden gestionar empleados"
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
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Gestión de Empleados</h2>
          </div>
          <EmployeeManagement />
        </div>
      </div>
    </RoleGuard>
  )
}
