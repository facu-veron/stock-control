"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Plus, MoreHorizontal, Edit, Trash2, Shield, UserCheck, UserX, Eye, EyeOff } from "lucide-react"
import { useEmployeesStore } from "@/stores/employees-store"
import type { User as Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from "@/lib/api"

export function EmployeeManagement() {
  const { employees, isLoading, error, fetchEmployees, createEmployee, updateEmployee, deleteEmployee, clearError } =
    useEmployeesStore()

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
    pin: "",
    active: true,
  })

  // Cargar empleados al montar el componente
  React.useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Mostrar errores
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
      clearError()
    }
  }, [error, clearError])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setFormData((prev) => ({ ...prev, pin }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "EMPLOYEE",
      pin: "",
      active: true,
    })
    setEditingEmployee(null)
    setShowPassword(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.pin) {
      toast({
        title: "Error",
        description: "Nombre, email y PIN son obligatorios",
        variant: "destructive",
      })
      return
    }

    if (!editingEmployee && !formData.password) {
      toast({
        title: "Error",
        description: "La contraseña es obligatoria para nuevos empleados",
        variant: "destructive",
      })
      return
    }

    // Verificar PIN único
    const pinExists = employees.some((emp) => emp.pin === formData.pin && emp.id !== editingEmployee?.id)

    if (pinExists) {
      toast({
        title: "Error",
        description: "El PIN ya está en uso por otro empleado",
        variant: "destructive",
      })
      return
    }

    // Verificar email único
    const emailExists = employees.some((emp) => emp.email === formData.email && emp.id !== editingEmployee?.id)

    if (emailExists) {
      toast({
        title: "Error",
        description: "El email ya está en uso por otro empleado",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingEmployee) {
        const updateData: UpdateEmployeeRequest = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          pin: formData.pin,
          role: formData.role,
          active: formData.active,
        }

        if (formData.password) {
          updateData.password = formData.password
        }

        await updateEmployee(editingEmployee.id, updateData)
        toast({
          title: "Empleado actualizado",
          description: `${formData.name} ha sido actualizado correctamente`,
        })
      } else {
        const createData: CreateEmployeeRequest = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          pin: formData.pin,
          role: formData.role,
        }

        await createEmployee(createData)
        toast({
          title: "Empleado creado",
          description: `${formData.name} ha sido agregado al sistema`,
        })
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      // El error ya se maneja en el store
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      password: "",
      phone: employee.phone || "",
      role: employee.role,
      pin: employee.pin || "",
      active: employee.active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId)
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema",
      })
    } catch (error) {
      // El error ya se maneja en el store
    }
  }

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      await updateEmployee(employee.id, { active: !employee.active })
      toast({
        title: employee.active ? "Empleado desactivado" : "Empleado activado",
        description: `${employee.name} ha sido ${employee.active ? "desactivado" : "activado"}`,
      })
    } catch (error) {
      // El error ya se maneja en el store
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de agregar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Empleados Registrados</h3>
          <p className="text-sm text-muted-foreground">Gestiona los empleados y sus permisos de acceso</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Modifica los datos del empleado"
                  : "Completa los datos para crear un nuevo empleado"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Ana García"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="empleado@boutique.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña {editingEmployee ? "(dejar vacío para no cambiar)" : "*"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+54 11 1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN de Venta (4 dígitos) *</Label>
                <div className="flex gap-2">
                  <Input
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => handleInputChange("pin", e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                    pattern="[0-9]{4}"
                  />
                  <Button type="button" variant="outline" onClick={generateRandomPin}>
                    Generar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este PIN se usará para identificar al empleado durante las ventas
                </p>
              </div>

              {editingEmployee && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => handleInputChange("active", checked)}
                  />
                  <Label htmlFor="active">Empleado activo</Label>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : editingEmployee ? "Actualizar" : "Crear"} Empleado
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de empleados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Lista de Empleados
          </CardTitle>
          <CardDescription>
            Total: {employees.length} empleados ({employees.filter((e) => e.active).length} activos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>PIN de Venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">{employee.email}</div>
                      {employee.phone && <div className="text-sm text-muted-foreground">{employee.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.role === "ADMIN" ? "default" : "secondary"}>
                      {employee.role === "ADMIN" ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Administrador
                        </>
                      ) : (
                        "Empleado"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{employee.pin || "N/A"}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.active ? "default" : "secondary"}>
                      {employee.active ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Activo
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 mr-1" />
                          Inactivo
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(employee.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(employee)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleEmployeeStatus(employee)}>
                          {employee.active ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(employee.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Información de permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>Descripción de los roles y permisos en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">Administrador</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Acceso completo al sistema</li>
                <li>• Gestión de productos y categorías</li>
                <li>• Gestión de empleados</li>
                <li>• Visualización de reportes</li>
                <li>• Configuraciones del sistema</li>
                <li>• Acceso al punto de venta</li>
                <li>• Gestión de facturas</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">Empleado</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Acceso únicamente al punto de venta</li>
                <li>• Procesamiento de ventas</li>
                <li>• Emisión de tickets y facturas</li>
                <li>• Consulta de productos disponibles</li>
                <li>• Identificación por PIN durante ventas</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Sobre el PIN de Venta</h4>
            <p className="text-sm text-muted-foreground">
              El PIN de 4 dígitos se utiliza únicamente para identificar qué empleado realizó una venta específica. No
              se usa para el login principal del sistema, que requiere email y contraseña.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
