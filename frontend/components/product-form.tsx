"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Shirt, Hash, Calculator, Loader2 } from "lucide-react"
import { useProductsStore } from "@/stores/products-store"
import { useCategoriesStore } from "@/stores/categories-store"
import { useSuppliersStore } from "@/stores/suppliers-store"
import type { CreateProductRequest } from "@/lib/api"

interface ProductFormProps {
  onSubmit?: (product: any) => void
  initialData?: any
  isEditing?: boolean
}

export function ProductForm({ onSubmit, initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter()
  const { createProduct, updateProduct, isLoading: productLoading } = useProductsStore()
  const { categories, fetchCategories, isLoading: categoriesLoading } = useCategoriesStore()
  const { suppliers, fetchSuppliers, isLoading: suppliersLoading } = useSuppliersStore()

  const [formData, setFormData] = React.useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    sku: initialData?.sku || "",
    categoryId: initialData?.categoryId || "",
    price: initialData?.price?.toString() || "",
    cost: initialData?.cost?.toString() || "",
    stock: initialData?.stock?.toString() || "",
    minStock: initialData?.minStock?.toString() || "",
    maxStock: initialData?.maxStock?.toString() || "",
    ivaRate: initialData?.ivaRate?.toString() || "21",
    barcode: initialData?.barcode || "",
    supplierId: initialData?.supplierId || "",
    size: initialData?.size || "",
    color: initialData?.color || "",
    material: initialData?.material || "",
    brand: initialData?.brand || "",
    unit: initialData?.unit || "unidad",
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Cargar categorías y proveedores usando los stores
  React.useEffect(() => {
    fetchCategories()
    fetchSuppliers()
  }, [fetchCategories, fetchSuppliers])

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "34", "36", "38", "40", "42", "44", "46", "48"]

  const colors = [
    "Negro",
    "Blanco",
    "Gris",
    "Azul",
    "Rojo",
    "Verde",
    "Amarillo",
    "Rosa",
    "Morado",
    "Naranja",
    "Marrón",
    "Beige",
    "Dorado",
    "Plateado",
  ]

  const materials = [
    "Algodón",
    "Poliéster",
    "Seda",
    "Lana",
    "Lino",
    "Denim",
    "Cuero",
    "Sintético",
    "Mezcla",
    "Viscosa",
    "Elastano",
    "Nylon",
  ]

  const taxRates = [
    { value: "0", label: "0% - Exento" },
    { value: "10.5", label: "10.5% - IVA Reducido" },
    { value: "21", label: "21% - IVA General" },
    { value: "27", label: "27% - IVA Aumentado" },
  ]

  const units = ["unidad", "par", "conjunto", "metro", "kilogramo", "gramo", "litro", "mililitro"]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre del artículo es obligatorio"
    }

    if (!formData.price || Number.parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a 0"
    }

    if (formData.cost && Number.parseFloat(formData.cost) < 0) {
      newErrors.cost = "El costo no puede ser negativo"
    }

    if (!formData.stock || Number.parseInt(formData.stock) < 0) {
      newErrors.stock = "El stock no puede ser negativo"
    }

    if (!formData.minStock || Number.parseInt(formData.minStock) < 0) {
      newErrors.minStock = "El stock mínimo no puede ser negativo"
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Seleccione una categoría"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const generateSKU = () => {
    const category = categories.find((c) => c.id === formData.categoryId)
    const prefix = category?.name.substring(0, 3).toUpperCase() || "PRD"
    const sizeCode = formData.size ? `-${formData.size}` : ""
    const colorCode = formData.color ? `-${formData.color.substring(0, 2).toUpperCase()}` : ""
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const sku = `${prefix}${sizeCode}${colorCode}-${random}`
    handleInputChange("sku", sku)
  }

  const calculateMargin = () => {
    const price = Number.parseFloat(formData.price) || 0
    const cost = Number.parseFloat(formData.cost) || 0
    if (cost > 0) {
      return (((price - cost) / cost) * 100).toFixed(1)
    }
    return "0"
  }

  const calculatePriceWithTax = () => {
    const price = Number.parseFloat(formData.price) || 0
    const taxRate = Number.parseFloat(formData.ivaRate) || 0
    return (price * (1 + taxRate / 100)).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error en el formulario",
        description: "Por favor, corrija los errores antes de continuar",
        variant: "destructive",
      })
      return
    }

    try {
      const productData: CreateProductRequest = {
        name: formData.name,
        description: formData.description || undefined,
        price: Number.parseFloat(formData.price),
        cost: formData.cost ? Number.parseFloat(formData.cost) : undefined,
        stock: Number.parseInt(formData.stock),
        minStock: Number.parseInt(formData.minStock),
        maxStock: formData.maxStock ? Number.parseInt(formData.maxStock) : undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
        brand: formData.brand || undefined,
        color: formData.color || undefined,
        size: formData.size || undefined,
        material: formData.material || undefined,
        unit: formData.unit,
        ivaRate: Number.parseFloat(formData.ivaRate),
        categoryId: formData.categoryId,
        supplierId: formData.supplierId || undefined,
      }

      if (isEditing && initialData?.id) {
        await updateProduct(initialData.id, productData)
      } else {
        await createProduct(productData)
      }

      // Si hay un callback personalizado, lo ejecutamos
      if (onSubmit) {
        onSubmit(productData)
      } else {
        // Si no hay callback, redirigimos a la lista de productos
        router.push("/productos")
      }

      // Limpiar formulario solo si estamos creando un nuevo producto
      if (!isEditing) {
        setFormData({
          name: "",
          description: "",
          sku: "",
          categoryId: "",
          price: "",
          cost: "",
          stock: "",
          minStock: "",
          maxStock: "",
          ivaRate: "21",
          barcode: "",
          supplierId: "",
          size: "",
          color: "",
          material: "",
          brand: "",
          unit: "unidad",
        })
      }
    } catch (error) {
      // El error ya se maneja en el store con toast
      console.error("Error submitting product:", error)
    }
  }

  const overallLoading = productLoading || categoriesLoading || suppliersLoading

  if (overallLoading && !isEditing) {
    // Only show full loading spinner on initial load for new product form
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Información Básica
            </CardTitle>
            <CardDescription>Datos principales del artículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Artículo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ej: Vestido Floral Primavera"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Descripción detallada del artículo..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    placeholder="VES-M-AZ-001"
                  />
                  <Button type="button" variant="outline" onClick={generateSKU}>
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                  placeholder="1234567890123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría *</Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleInputChange("categoryId", value)}>
                <SelectTrigger className={errors.categoryId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="" disabled>
                      Cargando categorías...
                    </SelectItem>
                  ) : categories.length === 0 ? (
                    <SelectItem value="" disabled>
                      No hay categorías disponibles
                    </SelectItem>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="Nombre de la marca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierId">Proveedor</Label>
              <Select value={formData.supplierId} onValueChange={(value) => handleInputChange("supplierId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersLoading ? (
                    <SelectItem value="" disabled>
                      Cargando proveedores...
                    </SelectItem>
                  ) : suppliers.length === 0 ? (
                    <SelectItem value="" disabled>
                      No hay proveedores disponibles
                    </SelectItem>
                  ) : (
                    suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad de Medida</Label>
              <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Características del producto */}
        <Card>
          <CardHeader>
            <CardTitle>Características</CardTitle>
            <CardDescription>Detalles específicos del artículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Talla</Label>
                <Select value={formData.size} onValueChange={(value) => handleInputChange("size", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => handleInputChange("color", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Select value={formData.material} onValueChange={(value) => handleInputChange("material", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Costo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => handleInputChange("cost", e.target.value)}
                    placeholder="0.00"
                    className={`pl-8 ${errors.cost ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.cost && <p className="text-sm text-red-500">{errors.cost}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio de Venta *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    placeholder="0.00"
                    className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ivaRate">Alícuota IVA</Label>
              <Select value={formData.ivaRate} onValueChange={(value) => handleInputChange("ivaRate", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxRates.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Actual *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  placeholder="0"
                  className={errors.stock ? "border-red-500" : ""}
                />
                {errors.stock && <p className="text-sm text-red-500">{errors.stock}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Stock Mínimo *</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => handleInputChange("minStock", e.target.value)}
                  placeholder="0"
                  className={errors.minStock ? "border-red-500" : ""}
                />
                {errors.minStock && <p className="text-sm text-red-500">{errors.minStock}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStock">Stock Máximo</Label>
                <Input
                  id="maxStock"
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) => handleInputChange("maxStock", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de cálculos */}
      {(formData.price || formData.cost) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen de Cálculos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{calculateMargin()}%</div>
                <div className="text-sm text-muted-foreground">Margen de Ganancia</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${calculatePriceWithTax()}</div>
                <div className="text-sm text-muted-foreground">Precio con IVA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${((Number.parseFloat(formData.price) || 0) - (Number.parseFloat(formData.cost) || 0)).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Ganancia por Unidad</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={productLoading}>
          {productLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Actualizar Artículo" : "Crear Artículo"}
        </Button>
      </div>
    </form>
  )
}
