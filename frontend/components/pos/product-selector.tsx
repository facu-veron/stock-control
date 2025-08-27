"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, Shirt, Minus, List, LayoutGrid } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { CartItem } from "@/components/pos/pos-interface"
import { getProducts, type Product } from "@/lib/api"

interface ProductSelectorProps {
  onAddToCart: (product: Omit<CartItem, "quantity" | "tax" | "total">, quantity: number) => void
}

export function ProductSelector({ onAddToCart }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    getProducts()
      .then((res) => {
        setProducts(res.data)
        setLoading(false)
      })
      .catch((err) => {
        setError("Error al cargar productos")
        setLoading(false)
      })
  }, [])

  // Obtener categorías únicas
  const categories = React.useMemo(() => Array.from(new Set(products.map((product) => product.category?.name || "Sin categoría"))), [products])

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode?.includes(searchTerm)
    const matchesCategory = selectedCategory === "all" || (product.category?.name === selectedCategory)
    return matchesSearch && matchesCategory
  })

  // Manejar cambio de cantidad
  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, quantity),
    }))
  }

  // Agregar producto al carrito
  const handleAddToCart = (product: (typeof products)[0]) => {
    const quantity = quantities[product.id] || 1

    if (product.stock < quantity) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${product.stock} unidades disponibles`,
        variant: "destructive",
      })
      return
    }

    onAddToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        taxRate: product.taxRate,
        discount: product.discount,
        category: product.category?.name || "Sin categoría",
      },
      quantity,
    )

    // Resetear cantidad
    setQuantities((prev) => ({
      ...prev,
      [product.id]: 1,
    }))
  }

  // Mostrar mensaje si no hay productos
  if (!loading && products.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No hay productos disponibles.</div>
  }

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Barra de búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Selector de vista */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "grid" | "list")}
        >
          <ToggleGroupItem value="grid" aria-label="Vista en cuadrícula">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Vista en lista">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          Todas
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Lista de productos */}
      <ScrollArea className="h-[400px]">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Cargando productos...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          viewMode === "grid" ? (
            // Vista en cuadrícula
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const quantity = quantities[product.id] || 1
                const isLowStock = product.stock <= 2

                return (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        {/* Información del producto */}
                        <div>
                          <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs">
                              {product.category?.name || "Sin categoría"}
                            </Badge>
                            {isLowStock && (
                              <Badge variant="destructive" className="text-xs">
                                Stock Bajo
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Talla: {product.size} | Color: {product.color}
                          </div>
                        </div>

                        {/* Precio y stock */}
                        <div className="space-y-1">
                          <div className="text-base font-bold">${product.price.toLocaleString("es-AR")}</div>
                          <div className="text-xs text-muted-foreground">Stock: {product.stock} unidades</div>
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(product.id, quantity - 1)}
                              disabled={quantity <= 1}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(product.id, quantity + 1)}
                              disabled={quantity >= product.stock}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Botón agregar */}
                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0}
                            size="sm"
                            className="h-6 px-2"
                          >
                            <Shirt className="h-3 w-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            // Vista en lista
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const quantity = quantities[product.id] || 1
                const isLowStock = product.stock <= 2

                return (
                  <Card key={product.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        {/* Información del producto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{product.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {product.category?.name || "Sin categoría"}
                            </Badge>
                            {isLowStock && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                Stock Bajo
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Talla: {product.size} | Color: {product.color} | Stock: {product.stock}
                          </div>
                        </div>

                        {/* Precio */}
                        <div className="text-right mx-4">
                          <div className="text-base font-bold">${product.price.toLocaleString("es-AR")}</div>
                        </div>

                        {/* Controles */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(product.id, quantity - 1)}
                              disabled={quantity <= 1}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(product.id, quantity + 1)}
                              disabled={quantity >= product.stock}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0}
                            size="sm"
                            className="h-6 px-2"
                          >
                            <Shirt className="h-3 w-3 mr-1" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        )}

        {filteredProducts.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Shirt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron artículos</p>
            <p className="text-sm">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
