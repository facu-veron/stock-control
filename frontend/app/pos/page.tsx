import type { Metadata } from "next"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import PosInterface from "@/components/pos/pos-interface"
import { RoleGuard } from "@/components/auth/role-guard"

export const metadata: Metadata = {
  title: "Punto de Venta",
  description: "Sistema de punto de venta para facturación electrónica",
}

export default function PosPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "EMPLOYEE"]}>
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
        <PosInterface />
      </div>
    </RoleGuard>
  )
}
