"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle } from "lucide-react"
import Link from "next/link"

// Productos de ejemplo con bajo stock
const initialLowStockProducts = [
  {
    id: "7",
    name: "Perfume Night Sky",
    stock: 3,
    category: "Perfumes",
    minStock: 5,
  },
  {
    id: "6",
    name: "Zapatos Deportivos",
    stock: 5,
    category: "Calzado",
    minStock: 10,
  },
  {
    id: "5",
    name: "Vestido Floral",
    stock: 8,
    category: "Ropa",
    minStock: 10,
  },
  {
    id: "4",
    name: "Perfume Ocean Breeze",
    stock: 9,
    category: "Perfumes",
    minStock: 10,
  },
]

export function LowStockAlert() {
  const [lowStockProducts, setLowStockProducts] = React.useState(initialLowStockProducts)

  // Cargar datos de stock (simulado)
  React.useEffect(() => {
    try {
      const productStock = JSON.parse(localStorage.getItem("productStock") || "{}")

      if (Object.keys(productStock).length > 0) {
        // Filtrar productos con bajo stock
        const mockProducts = [
          {
            id: "1",
            name: "Camisa Azul Slim Fit",
            category: "Ropa",
            minStock: 10,
          },
          {
            id: "2",
            name: "Perfume Elegance",
            category: "Perfumes",
            minStock: 5,
          },
          {
            id: "3",
            name: "Pantalón Vaquero",
            category: "Ropa",
            minStock: 10,
          },
          {
            id: "4",
            name: "Perfume Ocean Breeze",
            category: "Perfumes",
            minStock: 10,
          },
          {
            id: "5",
            name: "Vestido Floral",
            category: "Ropa",
            minStock: 10,
          },
          {
            id: "6",
            name: "Zapatos Deportivos",
            category: "Calzado",
            minStock: 10,
          },
          {
            id: "7",
            name: "Perfume Night Sky",
            category: "Perfumes",
            minStock: 5,
          },
        ]

        const lowStock = mockProducts
          .filter((product) => {
            const currentStock = productStock[product.id] || 0
            return currentStock < product.minStock
          })
          .map((product) => ({
            ...product,
            stock: productStock[product.id] || 0,
          }))
          .sort((a, b) => a.stock - b.stock)

        if (lowStock.length > 0) {
          setLowStockProducts(lowStock)
        }
      }
    } catch (error) {
      console.error("Error al cargar datos de stock:", error)
    }
  }, [])

  if (lowStockProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-center">
        <Package className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No hay productos con bajo stock</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {lowStockProducts.map((product) => (
        <div key={product.id} className="flex items-center justify-between border-b pb-2">
          <div>
            <div className="font-medium flex items-center">
              {product.name}
              {product.stock <= 3 && <AlertTriangle className="ml-2 h-4 w-4 text-red-500" />}
            </div>
            <div className="text-sm text-muted-foreground">{product.category}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={product.stock <= 3 ? "destructive" : "outline"} className="whitespace-nowrap">
              Stock: {product.stock}
            </Badge>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/productos">Ver todos los productos</Link>
        </Button>
      </div>
    </div>
  )
}
