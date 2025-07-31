"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCategoriesStore } from "@/stores/categories-store"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface CategoryFormProps {
  categoryId?: string
  initialData?: {
    name: string
    description?: string
  }
}

export function CategoryForm({ categoryId, initialData }: CategoryFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { createCategory, updateCategory, error, clearError } = useCategoriesStore()
  const router = useRouter()

  const isEditing = !!categoryId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    clearError()

    try {
      if (isEditing) {
        await updateCategory(categoryId, { name, description })
      } else {
        await createCategory({ name, description })
      }
      router.push("/categorias")
    } catch (error) {
      // El error ya se maneja en el store
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/categorias">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a categorías
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Categoría" : "Nueva Categoría"}</CardTitle>
          <CardDescription>
            {isEditing ? "Modifica los datos de la categoría" : "Completa los datos para crear una nueva categoría"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Ej: Electrónicos, Ropa, Hogar..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Descripción opcional de la categoría..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting
                  ? isEditing
                    ? "Actualizando..."
                    : "Creando..."
                  : isEditing
                    ? "Actualizar Categoría"
                    : "Crear Categoría"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/categorias">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
