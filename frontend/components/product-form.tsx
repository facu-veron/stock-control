"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Shirt, Hash, Calculator } from "lucide-react"

interface ProductFormProps {
  onSubmit?: (product: any) => void
  initialData?: any
  isEditing?: boolean
}

export function ProductForm({ onSubmit, initialData, isEditing = false }: ProductFormProps) {
  const [formData, setFormData] = React.useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    sku: initialData?.sku || "",
    category: initialData?.category || "",
    price: initialData?.price || "",
    cost: initialData?.cost || "",
    stock: initialData?.stock || "",
    minStock: initialData?.minStock || "",
    taxRate: initialData?.taxRate || "21",
    barcode: initialData?.barcode || "",
    supplier: initialData?.supplier || "",
    tags: initialData?.tags || "" as string,
    size: initialData?.size || "",
    color: initialData?.color || "",
    material: initialData?.material || "",
    brand: initialData?.brand || "",
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const categories = [
    "Vestidos",
    "Blusas",
    "Pantalones",
    "Faldas",
    "Chaquetas",
    "Calzado",
    "Accesorios",
    "Ropa Interior",
    "Camisas",
    "Sweaters",
    "Jeans",
    "Shorts",
    "Trajes",
    "Ropa Deportiva",
  ]

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

    if (!formData.cost || Number.parseFloat(formData.cost) < 0) {
      newErrors.cost = "El costo no puede ser negativo"
    }

    if (!formData.stock || Number.parseInt(formData.stock) < 0) {
      newErrors.stock = "El stock no puede ser negativo"
    }

    if (!formData.minStock || Number.parseInt(formData.minStock) < 0) {
      newErrors.minStock = "El stock mínimo no puede ser negativo"
    }

    if (!formData.category) {
      newErrors.category = "Seleccione una categoría"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const generateSKU = () => {
    const prefix = formData.category.substring(0, 3).toUpperCase()
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
    const taxRate = Number.parseFloat(formData.taxRate) || 0
    return (price * (1 + taxRate / 100)).toFixed(2)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error en el formulario",
        description: "Por favor, corrija los errores antes de continuar",
        variant: "destructive",
      })
      return
    }

    const productData = {
      ...formData,
      price: Number.parseFloat(formData.price),
      cost: Number.parseFloat(formData.cost),
      stock: Number.parseInt(formData.stock),
      minStock: Number.parseInt(formData.minStock),
      taxRate: Number.parseFloat(formData.taxRate),
      tags: formData.tags
        .split(",")
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      margin: Number.parseFloat(calculateMargin()),
      priceWithTax: Number.parseFloat(calculatePriceWithTax()),
      createdAt: initialData?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    onSubmit?.(productData)

    toast({
      title: isEditing ? "Artículo actualizado" : "Artículo creado",
      description: `${productData.name} ha sido ${isEditing ? "actualizado" : "agregado"} correctamente`,
    })

    if (!isEditing) {
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        price: "",
        cost: "",
        stock: "",
        minStock: "",
        taxRate: "21",
        barcode: "",
        supplier: "",
        tags: "",
        size: "",
        color: "",
        material: "",
        brand: "",
      })
    }
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
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
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
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleInputChange("supplier", e.target.value)}
                placeholder="Nombre del proveedor"
              />
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
                <Label htmlFor="cost">Costo *</Label>
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
              <Label htmlFor="taxRate">Alícuota IVA</Label>
              <Select value={formData.taxRate} onValueChange={(value) => handleInputChange("taxRate", value)}>
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Etiquetas</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="casual, elegante, verano"
              />
              <p className="text-xs text-muted-foreground">Separar con comas</p>
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
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit">{isEditing ? "Actualizar Artículo" : "Crear Artículo"}</Button>
      </div>
    </form>
  )
}
