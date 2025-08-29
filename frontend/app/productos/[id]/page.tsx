"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { RoleGuard } from "@/components/auth/role-guard"
import { ProductForm } from "@/components/product-form"
import { useProductsStore } from "@/stores/products-store"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Product } from "@/lib/api"

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { products, fetchProducts, isLoading } = useProductsStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [notFound, setNotFound] = useState(false)

  const productId = params.id as string

  useEffect(() => {
    const loadProduct = async () => {
      if (products.length === 0) {
        await fetchProducts()
      }
      
      const foundProduct = products.find(p => p.id === productId)
      if (foundProduct) {
        setProduct(foundProduct)
      } else {
        setNotFound(true)
      }
    }

    if (productId) {
      loadProduct()
    }
  }, [productId, products, fetchProducts])



  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["admin"]} fallbackMessage="Solo los administradores pueden gestionar artículos">
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
          <div className="flex-1 flex items-center justify-center">
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Cargando producto...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (notFound) {
    return (
      <RoleGuard allowedRoles={["admin"]} fallbackMessage="Solo los administradores pueden gestionar artículos">
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
          <div className="flex-1 flex items-center justify-center">
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Producto no encontrado</h2>
                  <p className="text-muted-foreground mb-4">El producto que buscas no existe o fue eliminado.</p>
                  <Button asChild>
                    <Link href="/productos">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver a productos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin"]} fallbackMessage="Solo los administradores pueden gestionar artículos">
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
          <div className="flex items-center justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/productos">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Editar Artículo</h2>
              </div>
              {product && (
                <p className="text-muted-foreground">
                  Editando: {product.name}
                </p>
              )}
            </div>

          </div>
          {product && (
            <ProductForm 
              initialData={product}
              isEditing={true}
            />
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
