"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { User, Lock, Users, Shield } from "lucide-react"
import type { Employee } from "@/components/pos/pos-interface"

// Empleados de ejemplo
const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "Ana García",
    pin: "1234",
    role: "admin",
    isActive: true,
  },
  {
    id: "2",
    name: "Carlos López",
    pin: "5678",
    role: "employee",
    isActive: true,
  },
  {
    id: "3",
    name: "María Rodríguez",
    pin: "9999",
    role: "employee",
    isActive: true,
  },
  {
    id: "4",
    name: "Juan Pérez",
    pin: "0000",
    role: "admin",
    isActive: false,
  },
]

interface EmployeeLoginProps {
  onLogin: (employee: Employee) => void
}

export function EmployeeLogin({ onLogin }: EmployeeLoginProps) {
  const [pin, setPin] = React.useState("")
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const activeEmployees = sampleEmployees.filter((emp) => emp.isActive)

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    setPin("")
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit)
    }
  }

  const handlePinClear = () => {
    setPin("")
  }

  const handleLogin = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Selecciona un empleado",
        variant: "destructive",
      })
      return
    }

    if (pin.length !== 4) {
      toast({
        title: "Error",
        description: "El PIN debe tener 4 dígitos",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Simular verificación
    setTimeout(() => {
      if (pin === selectedEmployee.pin) {
        onLogin(selectedEmployee)
      } else {
        toast({
          title: "PIN incorrecto",
          description: "Verifica tu PIN e intenta nuevamente",
          variant: "destructive",
        })
        setPin("")
      }
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      handlePinInput(e.key)
    } else if (e.key === "Enter") {
      handleLogin()
    } else if (e.key === "Backspace") {
      setPin((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
            <p className="text-muted-foreground">Inicia sesión para comenzar</p>
          </div>

          {!selectedEmployee ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Seleccionar Empleado
                </CardTitle>
                <CardDescription>Elige tu perfil para continuar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeEmployees.map((employee) => (
                  <Button
                    key={employee.id}
                    variant="outline"
                    className="w-full justify-between h-auto p-4 bg-transparent"
                    onClick={() => handleEmployeeSelect(employee)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {employee.id}</div>
                      </div>
                    </div>
                    <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                      {employee.role === "admin" ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        "Empleado"
                      )}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Ingresa tu PIN
                </CardTitle>
                <CardDescription>Hola {selectedEmployee.name}, ingresa tu PIN de 4 dígitos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mostrar PIN */}
                <div className="flex justify-center">
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="w-12 h-12 border-2 border-border rounded-lg flex items-center justify-center text-xl font-bold bg-background"
                      >
                        {pin[index] ? "•" : ""}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teclado numérico */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <Button
                      key={digit}
                      variant="outline"
                      size="lg"
                      onClick={() => handlePinInput(digit.toString())}
                      disabled={pin.length >= 4}
                      className="h-12 text-lg font-semibold"
                    >
                      {digit}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePinClear}
                    className="h-12 text-lg font-semibold bg-transparent"
                  >
                    Borrar
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handlePinInput("0")}
                    disabled={pin.length >= 4}
                    className="h-12 text-lg font-semibold"
                  >
                    0
                  </Button>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleLogin}
                    disabled={pin.length !== 4 || isLoading}
                    className="h-12 text-lg font-semibold"
                  >
                    {isLoading ? "..." : "OK"}
                  </Button>
                </div>

                <Button variant="ghost" onClick={() => setSelectedEmployee(null)} className="w-full">
                  Cambiar empleado
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Información de empleados de prueba */}
          <Card className="bg-muted/50 border-muted">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2">Empleados de Prueba:</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Ana García (Admin) - PIN: 1234</div>
                <div>• Carlos López (Empleado) - PIN: 5678</div>
                <div>• María Rodríguez (Empleado) - PIN: 9999</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Input oculto para capturar teclado */}
      <Input type="password" className="sr-only" onKeyDown={handleKeyPress} autoFocus />
    </div>
  )
}
