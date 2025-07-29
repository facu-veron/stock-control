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
import { User, Plus, MoreHorizontal, Edit, Trash2, Shield, UserCheck, UserX } from "lucide-react"
import type { Employee } from "@/components/pos/pos-interface"

// Empleados de ejemplo con más datos
const initialEmployees: Employee[] = [
  {
    id: "1",
    name: "Ana García",
    pin: "1234",
    role: "admin",
    isActive: true,
    email: "ana.garcia@boutique.com",
    phone: "+54 11 1234-5678",
    hireDate: new Date("2023-01-15"),
    permissions: ["all"],
  },
  {
    id: "2",
    name: "Carlos López",
    pin: "5678",
    role: "employee",
    isActive: true,
    email: "carlos.lopez@boutique.com",
    phone: "+54 11 2345-6789",
    hireDate: new Date("2023-03-20"),
    permissions: ["access_pos"],
  },
  {
    id: "3",
    name: "María Rodríguez",
    pin: "9999",
    role: "employee",
    isActive: true,
    email: "maria.rodriguez@boutique.com",
    phone: "+54 11 3456-7890",
    hireDate: new Date("2023-05-10"),
    permissions: ["access_pos"],
  },
  {
    id: "4",
    name: "Juan Pérez",
    pin: "0000",
    role: "employee",
    isActive: false,
    email: "juan.perez@boutique.com",
    phone: "+54 11 4567-8901",
    hireDate: new Date("2022-11-05"),
    permissions: ["access_pos"],
  },
]

interface ExtendedEmployee extends Employee {
  email?: string
  phone?: string
  hireDate?: Date
  permissions?: string[]
}

export function EmployeeManagement() {
  const [employees, setEmployees] = React.useState<ExtendedEmployee[]>(initialEmployees)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingEmployee, setEditingEmployee] = React.useState<ExtendedEmployee | null>(null)
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
    role: "employee" as "admin" | "employee",
    pin: "",
    isActive: true,
  })

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
      phone: "",
      role: "employee",
      pin: "",
      isActive: true,
    })
    setEditingEmployee(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.pin) {
      toast({
        title: "Error",
        description: "Nombre y PIN son obligatorios",
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

    const employeeData: ExtendedEmployee = {
      id: editingEmployee?.id || Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      pin: formData.pin,
      isActive: formData.isActive,
      hireDate: editingEmployee?.hireDate || new Date(),
      permissions: formData.role === "admin" ? ["all"] : ["access_pos"],
    }

    if (editingEmployee) {
      setEmployees((prev) => prev.map((emp) => (emp.id === editingEmployee.id ? employeeData : emp)))
      toast({
        title: "Empleado actualizado",
        description: `${employeeData.name} ha sido actualizado correctamente`,
      })
    } else {
      setEmployees((prev) => [...prev, employeeData])
      toast({
        title: "Empleado creado",
        description: `${employeeData.name} ha sido agregado al sistema`,
      })
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleEdit = (employee: ExtendedEmployee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email || "",
      phone: employee.phone || "",
      role: employee.role,
      pin: employee.pin,
      isActive: employee.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (employeeId: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId))
    toast({
      title: "Empleado eliminado",
      description: "El empleado ha sido eliminado del sistema",
    })
  }

  const toggleEmployeeStatus = (employeeId: string) => {
    setEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? { ...emp, isActive: !emp.isActive } : emp)))

    const employee = employees.find((emp) => emp.id === employeeId)
    toast({
      title: employee?.isActive ? "Empleado desactivado" : "Empleado activado",
      description: `${employee?.name} ha sido ${employee?.isActive ? "desactivado" : "activado"}`,
    })
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Modifica los datos del empleado"
                  : "Completa los datos para crear un nuevo empleado"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="empleado@boutique.com"
                />
              </div>

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
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN de Acceso *</Label>
                <div className="flex gap-2">
                  <Input
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => handleInputChange("pin", e.target.value)}
                    placeholder="4 dígitos"
                    maxLength={4}
                  />
                  <Button type="button" variant="outline" onClick={generateRandomPin}>
                    Generar
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
                <Label htmlFor="isActive">Empleado activo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingEmployee ? "Actualizar" : "Crear"} Empleado</Button>
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
            Total: {employees.length} empleados ({employees.filter((e) => e.isActive).length} activos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Ingreso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{employee.name}</div>
                      {employee.email && <div className="text-sm text-muted-foreground">{employee.email}</div>}
                      {employee.phone && <div className="text-sm text-muted-foreground">{employee.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                      {employee.role === "admin" ? (
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
                    <code className="bg-muted px-2 py-1 rounded text-sm">{employee.pin}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? "default" : "secondary"}>
                      {employee.isActive ? (
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
                  <TableCell>{employee.hireDate?.toLocaleDateString()}</TableCell>
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
                        <DropdownMenuItem onClick={() => toggleEmployeeStatus(employee.id)}>
                          {employee.isActive ? (
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
          <CardTitle>Permisos por Rol</CardTitle>
          <CardDescription>Descripción de los permisos asignados a cada rol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">Administrador</h4>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Acceso completo al dashboard</li>
                <li>• Gestión de artículos y categorías</li>
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
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
