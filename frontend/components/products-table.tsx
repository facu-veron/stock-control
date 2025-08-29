"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Search, Download, Eye, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExcelImportExport } from "@/components/excel-import-export"
import { useProductsStore } from "@/stores/products-store"
import type { Product } from "@/lib/api"
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

interface ProductsTableProps {
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  onView?: (product: Product) => void
}

export function ProductsTable({ onEdit, onDelete, onView }: ProductsTableProps) {
  const { products, isLoading, error, fetchProducts, deleteProduct, deactivateProduct, reactivateProduct } = useProductsStore()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [supplierFilter, setSupplierFilter] = React.useState<string>("all")
  const [brandFilter, setBrandFilter] = React.useState<string>("all")

  // Cargar productos al montar el componente
  React.useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Producto
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{product.name}</div>
            <div className="text-sm text-muted-foreground">{product.sku}</div>
            {product.brand && <div className="text-xs text-muted-foreground">Marca: {product.brand}</div>}
            {product.description && (
              <div className="text-xs text-muted-foreground max-w-[200px] truncate">{product.description}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => {
        const category = row.original.category
        return (
          <Badge variant="outline" style={{ backgroundColor: category?.color + "20", borderColor: category?.color }}>
            {category?.name}
          </Badge>
        )
      },
    },
    {
      accessorKey: "supplier",
      header: "Proveedor",
      cell: ({ row }) => {
        const supplier = row.original.supplier
        return supplier ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{supplier.name}</div>
            {supplier.contact && <div className="text-xs text-muted-foreground">{supplier.contact}</div>}
          </div>
        ) : (
          <span className="text-muted-foreground">Sin proveedor</span>
        )
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Precio
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const price = row.original.price
        const ivaRate = row.original.ivaRate || 21
        const priceWithTax = price * (1 + ivaRate / 100)
        return (
          <div className="text-right space-y-1">
            <div className="font-medium">${price.toLocaleString("es-AR")}</div>
            <div className="text-xs text-muted-foreground">${priceWithTax.toLocaleString("es-AR")} (c/IVA)</div>
          </div>
        )
      },
    },
    {
      accessorKey: "cost",
      header: "Costo",
      cell: ({ row }) => {
        const cost = row.original.cost || 0
        return <div className="text-right">${cost.toLocaleString("es-AR")}</div>
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Stock
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const stock = row.original.stock
        const minStock = row.original.minStock
        const isLowStock = stock <= minStock

        return (
          <div className="text-right space-y-1">
            <div className={`font-medium ${isLowStock ? "text-red-600" : ""}`}>{stock}</div>
            <div className="text-xs text-muted-foreground">Min: {minStock}</div>
            {isLowStock && (
              <Badge variant="destructive" className="text-xs">
                Stock Bajo
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "details",
      header: "Detalles",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="space-y-1 text-xs">
            {product.color && <div>Color: {product.color}</div>}
            {product.size && <div>Talla: {product.size}</div>}
            {product.material && <div>Material: {product.material}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: "tags",
      header: "Etiquetas",
      cell: ({ row }) => {
        const tags = row.original.tags || []
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "active",
      header: "Estado",
      cell: ({ row }) => {
        const active = row.original.active
        return <Badge variant={active ? "default" : "secondary"}>{active ? "Activo" : "Inactivo"}</Badge>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original

        const handleDelete = async () => {
          try {
            await deleteProduct(product.id)
            toast({
              title: "Producto eliminado",
              description: `El producto "${product.name}" ha sido eliminado correctamente.`,
            })
          } catch (err: any) {
            // Handle specific error codes from the backend
            if (err?.response?.data?.code === "PRODUCT_HAS_SALES" || err?.response?.data?.code === "FOREIGN_KEY_CONSTRAINT") {
              toast({
                title: "No se puede eliminar",
                description: err.response.data.error || "El producto ha sido utilizado en ventas y no puede eliminarse.",
                variant: "destructive",
                action: (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeactivate()}
                  >
                    Desactivar
                  </Button>
                ),
              })
            } else {
              toast({
                title: "Error al eliminar",
                description: `No se pudo eliminar el producto. ${err instanceof Error ? err.message : ""}`,
                variant: "destructive",
              })
            }
          }
        }

        const handleDeactivate = async () => {
          try {
            await deactivateProduct(product.id)
          } catch (err) {
            // Error handling is already done in the store
            console.error("Error deactivating product:", err)
          }
        }

        const handleReactivate = async () => {
          try {
            await reactivateProduct(product.id)
          } catch (err) {
            // Error handling is already done in the store
            console.error("Error reactivating product:", err)
          }
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>Copiar ID</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView?.(product)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(product)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {!product.active && (
                <DropdownMenuItem onClick={() => handleReactivate()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Reactivar
                </DropdownMenuItem>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminará permanentemente el producto
                      <span className="font-semibold"> "{product.name}"</span>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filtrar datos
  const filteredData = React.useMemo(() => {
    return products.filter((product) => {
      const matchesGlobal =
        globalFilter === "" ||
        product.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        product.sku?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        product.brand?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        product.description?.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesCategory = categoryFilter === "all" || product.category?.name === categoryFilter
      const matchesSupplier = supplierFilter === "all" || product.supplier?.name === supplierFilter
      const matchesBrand = brandFilter === "all" || product.brand === brandFilter

      return matchesGlobal && matchesCategory && matchesSupplier && matchesBrand
    })
  }, [products, globalFilter, categoryFilter, supplierFilter, brandFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const categories = Array.from(new Set(products.map((product) => product.category?.name).filter(Boolean)))
  const suppliers = Array.from(new Set(products.map((product) => product.supplier?.name).filter(Boolean)))
  const brands = Array.from(new Set(products.map((product) => product.brand).filter(Boolean)))

  const handleExportToExcel = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const dataToExport = selectedRows.length > 0 ? selectedRows.map((row) => row.original) : filteredData

    // Preparar datos para Excel
    const excelData = dataToExport.map((product) => ({
      Nombre: product.name,
      SKU: product.sku || "",
      Marca: product.brand || "",
      Categoría: product.category?.name || "",
      Proveedor: product.supplier?.name || "",
      Precio: product.price,
      Costo: product.cost || 0,
      Stock: product.stock,
      "Stock Mínimo": product.minStock,
      "IVA %": product.ivaRate || 21,
      Color: product.color || "",
      Talla: product.size || "",
      Material: product.material || "",
      Estado: product.active ? "Activo" : "Inactivo",
      "Código de Barras": product.barcode || "",
      Descripción: product.description || "",
      Etiquetas: product.tags?.map((tag) => tag.name).join(", ") || "",
      Creado: new Date(product.createdAt).toLocaleDateString(),
      Actualizado: new Date(product.updatedAt).toLocaleDateString(),
    }))

    // Simular descarga
    console.log("Exportando a Excel:", excelData)
    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${excelData.length} productos a Excel`,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando productos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error al cargar productos: {error}</p>
            <Button onClick={() => fetchProducts()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Gestiona tu inventario de productos. Total: {filteredData.length} productos</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros y búsqueda */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier || ""}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand || ""}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barra de herramientas */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <ExcelImportExport />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s)
              seleccionada(s).
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
