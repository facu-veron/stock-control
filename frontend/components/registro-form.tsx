"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"

export function RegistroForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE")
  const [formError, setFormError] = useState("")

  const { register, isLoading, error, clearError } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setFormError("")

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      await register({ name, email, password, role })
      router.push("/")
    } catch (error) {
      // El error ya se maneja en el store
    }
  }

  const displayError = error || formError

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Crear Cuenta</CardTitle>
        <CardDescription>Completa los datos para crear tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <Alert variant="destructive">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(value: "ADMIN" | "EMPLOYEE") => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
