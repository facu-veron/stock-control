"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { User, Lock, ArrowLeft } from "lucide-react"
import { useEmployeesStore } from "@/stores/employees-store"
import type { User as Employee } from "@/lib/api"

interface PinVerificationProps {
  onEmployeeVerified: (employee: Employee) => void
  onCancel: () => void
  title?: string
  description?: string
}

export function PinVerification({
  onEmployeeVerified,
  onCancel,
  title = "Verificación de Empleado",
  description = "Ingresa tu PIN de 4 dígitos para continuar",
}: PinVerificationProps) {
  const [pin, setPin] = React.useState("")
  const [isVerifying, setIsVerifying] = React.useState(false)
  const { verifyPin, clearError } = useEmployeesStore()

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit)
    }
  }

  const handlePinClear = () => {
    setPin("")
    clearError()
  }

  const handleVerify = async () => {
    if (pin.length !== 4) {
      toast({
        title: "PIN incompleto",
        description: "El PIN debe tener 4 dígitos",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)

    try {
      const employee = await verifyPin(pin)
      if (employee) {
        onEmployeeVerified(employee)
        toast({
          title: "PIN verificado",
          description: `Empleado: ${employee.name}`,
        })
      } else {
        toast({
          title: "PIN incorrecto",
          description: "Verifica tu PIN e intenta nuevamente",
          variant: "destructive",
        })
        setPin("")
      }
    } catch (error) {
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el PIN",
        variant: "destructive",
      })
      setPin("")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      handlePinInput(e.key)
    } else if (e.key === "Enter") {
      handleVerify()
    } else if (e.key === "Backspace") {
      setPin((prev) => prev.slice(0, -1))
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
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
                disabled={pin.length >= 4 || isVerifying}
                className="h-12 text-lg font-semibold"
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              onClick={handlePinClear}
              disabled={isVerifying}
              className="h-12 text-lg font-semibold bg-transparent"
            >
              Borrar
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handlePinInput("0")}
              disabled={pin.length >= 4 || isVerifying}
              className="h-12 text-lg font-semibold"
            >
              0
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleVerify}
              disabled={pin.length !== 4 || isVerifying}
              className="h-12 text-lg font-semibold"
            >
              {isVerifying ? "..." : "OK"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </CardContent>

        {/* Input oculto para capturar teclado */}
        <input type="password" className="sr-only" onKeyDown={handleKeyPress} autoFocus value="" onChange={() => {}} />
      </Card>
    </div>
  )
}
