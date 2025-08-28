"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCategoriesStore } from "@/stores/categories-store"
import { Edit, Plus, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import type { Category } from "@/lib/api"

export function CategoriesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const { categories, isLoading, error, fetchCategories, deleteCategory, clearError } = useCategoriesStore()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory(category.id)
      toast({
        title: "Categoría eliminada",
        description: `La categoría "${category.name}" ha sido eliminada correctamente.`,
      })
    } catch (err) {
      // El error ya se maneja en el store, que mostrará un toast de error.
    }
  }

  if (isLoading && categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorías</CardTitle>
          <CardDescription>Cargando categorías...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
      <div className="flex items-center justify-end">
  <Button asChild>
    <Link href="/categorias/nueva">
      <Plus className="mr-2 h-4 w-4" />
      Nueva Categoría
    </Link>
  </Button>
</div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-2">
                Cerrar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? "No se encontraron categorías" : "No hay categorías registradas"}
            </p>
            {!searchTerm && (
              <Button asChild className="mt-4">
                <Link href="/categorias/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera categoría
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha de creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {category.description || <span className="text-muted-foreground">Sin descripción</span>}
                    </TableCell>
                    <TableCell>{new Date(category.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/categorias/${category.id}/editar`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la categoría "
                                <span className="font-semibold">{category.name}</span>".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
