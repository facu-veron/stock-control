"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Loader2 } from "lucide-react"

const formSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un correo electrónico válido.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
})

export function LoginForm() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuth()
  const [showPassword, setShowPassword] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error de inicio de sesión",
        description: error,
        variant: "destructive",
      })
      clearError()
    }
  }, [error, clearError])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await login({
        email: values.email,
        password: values.password,
      })

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema de inventario.",
      })

      // Redirigir según el rol del usuario
      router.push("/")
    } catch (error) {
      // El error ya se maneja en el store y se muestra en el useEffect
      console.error("Login error:", error)
    }
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input placeholder="nombre@ejemplo.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        <p>Credenciales de prueba:</p>
        <p className="mt-1">
          <strong>Admin:</strong> admin@boutique.com / admin123
        </p>
        <p>
          <strong>Empleado:</strong> empleado@boutique.com / empleado123
        </p>
      </div>
    </div>
  )
}
