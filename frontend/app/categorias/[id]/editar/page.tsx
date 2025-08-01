"use client"

import { useEffect, useState } from "react"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { CategoryForm } from "@/components/category-form"
import { RoleGuard } from "@/components/auth/role-guard"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, type Category } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

interface EditCategoryPageProps {
  params: {
    id: string
  }
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { user } = useAuth()
  const categoryId = params.id
  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await apiClient.getCategoryById(categoryId)
        if (response.success && response.data) {
          setCategory(response.data)
        } else {
          setError(response.error || "Error al cargar la categoría")
        }
      } catch (error) {
        setError("Error al cargar la categoría")
      } finally {
        setIsLoading(false)
      }
    }

    if (categoryId) {
      fetchCategory()
    }
  }, [categoryId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <Skeleton className="h-8 w-32" />
            <div className="ml-auto flex items-center space-x-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <Skeleton className="h-9 w-48" />
          <div className="max-w-2xl mx-auto space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
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
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="text-center text-red-600">{error || "Categoría no encontrada"}</div>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard
      allowedRoles={["admin"]}
      currentUser={user}
      fallbackMessage="Solo los administradores pueden editar categorías"
    >
      <div className="container mx-auto py-6">
        <CategoryForm
          categoryId={categoryId}
          initialData={{
            name: category.name,
            description: category.description || "",
          }}
        />
      </div>
    </RoleGuard>
  )
}
