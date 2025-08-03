"use client"

import { useAuthStore } from "@/stores/auth-store"
import { MainNav } from "@/components/main-nav"
import { Search } from "@/components/search"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppearanceSettings } from "@/components/appearance-settings"
import { ExcelImportExport } from "@/components/excel-import-export"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { EmployeeManagement } from "@/components/employee-management"

export default function ConfiguracionesPage() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="hidden flex-col md:flex">
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
          <h2 className="text-3xl font-bold tracking-tight">Configuraciones</h2>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
            {user.role === "ADMIN" && (
              <>
                <TabsTrigger value="employees">Empleados</TabsTrigger>
                <TabsTrigger value="system">Sistema</TabsTrigger>
                <TabsTrigger value="import-export">Importar/Exportar</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Gestiona tu información personal y configuraciones de cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" value={user.name} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email} readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <div>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role === "ADMIN" ? "Administrador" : "Empleado"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Cambiar contraseña</Label>
                  <p className="text-sm text-muted-foreground">
                    Funcionalidad para cambiar contraseña estará disponible próximamente.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Cambiar contraseña
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <AppearanceSettings />
          </TabsContent>

          {user.role === "ADMIN" && (
            <>
              <TabsContent value="employees" className="space-y-4">
                <EmployeeManagement />
              </TabsContent>
              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuraciones del Sistema</CardTitle>
                    <CardDescription>
                      Configuraciones avanzadas del sistema (solo para administradores).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Esta sección está en desarrollo.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="import-export" className="space-y-4">
                <ExcelImportExport />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
