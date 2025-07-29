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

export type Product = {
  id: string
  name: string
  description?: string
  sku: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  taxRate: number
  barcode?: string
  supplier?: string
  tags?: string[]
  margin: number
  priceWithTax: number
  createdAt: Date
  updatedAt: Date
  status: "active" | "inactive" | "discontinued"
}

// Datos de ejemplo
const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Smartphone Samsung Galaxy A54",
    description: "Smartphone con pantalla de 6.4 pulgadas, 128GB de almacenamiento",
    sku: "ELE-0001",
    category: "Electrónicos",
    price: 299999,
    cost: 220000,
    stock: 15,
    minStock: 5,
    taxRate: 21,
    barcode: "7798123456789",
    supplier: "Samsung Argentina",
    tags: ["smartphone", "android", "samsung"],
    margin: 36.4,
    priceWithTax: 362999,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    status: "active",
  },
  {
    id: "2",
    name: "Notebook Lenovo ThinkPad E14",
    description: "Notebook empresarial con procesador Intel i5, 8GB RAM, 256GB SSD",
    sku: "ELE-0002",
    category: "Electrónicos",
    price: 899999,
    cost: 650000,
    stock: 8,
    minStock: 3,
    taxRate: 21,
    barcode: "7798987654321",
    supplier: "Lenovo Argentina",
    tags: ["notebook", "laptop", "lenovo", "business"],
    margin: 38.5,
    priceWithTax: 1088999,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18"),
    status: "active",
  },
  {
    id: "3",
    name: "Auriculares Sony WH-1000XM4",
    description: "Auriculares inalámbricos con cancelación de ruido",
    sku: "ELE-0003",
    category: "Electrónicos",
    price: 189999,
    cost: 140000,
    stock: 2,
    minStock: 5,
    taxRate: 21,
    barcode: "7798456123789",
    supplier: "Sony Argentina",
    tags: ["auriculares", "wireless", "sony", "noise-cancelling"],
    margin: 35.7,
    priceWithTax: 229999,
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-22"),
    status: "active",
  },
  {
    id: "4",
    name: "Remera Básica Algodón",
    description: "Remera de algodón 100%, disponible en varios colores",
    sku: "ROP-0001",
    category: "Ropa y Accesorios",
    price: 8999,
    cost: 5500,
    stock: 50,
    minStock: 20,
    taxRate: 21,
    barcode: "7798111222333",
    supplier: "Textil San Juan",
    tags: ["remera", "algodón", "básica"],
    margin: 63.6,
    priceWithTax: 10889,
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-15"),
    status: "active",
  },
  {
    id: "5",
    name: "Cafetera Philips HD7447",
    description: "Cafetera de filtro para 10-15 tazas",
    sku: "HOG-0001",
    category: "Hogar y Jardín",
    price: 45999,
    cost: 32000,
    stock: 12,
    minStock: 8,
    taxRate: 21,
    barcode: "7798555666777",
    supplier: "Philips Argentina",
    tags: ["cafetera", "philips", "hogar"],
    margin: 43.7,
    priceWithTax: 55659,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-19"),
    status: "active",
  },
]

interface ProductsTableProps {
  data?: Product[]
  onEdit?: (product: Product) => void
  onDelete?: (productId: string) => void
  onView?: (product: Product) => void
}

export function ProductsTable({ data = sampleProducts, onEdit, onDelete, onView }: ProductsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

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
      cell: ({ row }) => <Badge variant="outline">{row.getValue("category")}</Badge>,
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
        const price = Number.parseFloat(row.getValue("price"))
        const priceWithTax = row.original.priceWithTax
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
        const cost = Number.parseFloat(row.getValue("cost"))
        return <div className="text-right">${cost.toLocaleString("es-AR")}</div>
      },
    },
    {
      accessorKey: "margin",
      header: "Margen",
      cell: ({ row }) => {
        const margin = row.getValue("margin") as number
        return (
          <div className="text-right">
            <Badge variant={margin > 30 ? "default" : margin > 15 ? "secondary" : "destructive"}>
              {margin.toFixed(1)}%
            </Badge>
          </div>
        )
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
        const stock = row.getValue("stock") as number
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
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const statusConfig = {
          active: { label: "Activo", variant: "default" as const },
          inactive: { label: "Inactivo", variant: "secondary" as const },
          discontinued: { label: "Descontinuado", variant: "destructive" as const },
        }
        const config = statusConfig[status as keyof typeof statusConfig]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado",
      cell: ({ row }) => {
        const date = row.getValue("updatedAt") as Date
        return <div className="text-sm">{date.toLocaleDateString()}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original

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
              <DropdownMenuItem onClick={() => onDelete?.(product.id)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filtrar datos
  const filteredData = React.useMemo(() => {
    return data.filter((product) => {
      const matchesGlobal =
        globalFilter === "" ||
        product.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        product.sku.toLowerCase().includes(globalFilter.toLowerCase()) ||
        product.description?.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
      const matchesStatus = statusFilter === "all" || product.status === statusFilter

      return matchesGlobal && matchesCategory && matchesStatus
    })
  }, [data, globalFilter, categoryFilter, statusFilter])

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

  const categories = Array.from(new Set(data.map((product) => product.category)))

  const handleExportToExcel = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const dataToExport = selectedRows.length > 0 ? selectedRows.map((row) => row.original) : filteredData

    // Preparar datos para Excel
    const excelData = dataToExport.map((product) => ({
      Nombre: product.name,
      SKU: product.sku,
      Categoría: product.category,
      Precio: product.price,
      "Precio con IVA": product.priceWithTax,
      Costo: product.cost,
      "Margen %": product.margin,
      Stock: product.stock,
      "Stock Mínimo": product.minStock,
      "IVA %": product.taxRate,
      Estado: product.status,
      Proveedor: product.supplier || "",
      "Código de Barras": product.barcode || "",
      Descripción: product.description || "",
      Etiquetas: product.tags?.join(", ") || "",
      Creado: product.createdAt.toLocaleDateString(),
      Actualizado: product.updatedAt.toLocaleDateString(),
    }))

    // Simular descarga
    console.log("Exportando a Excel:", excelData)
    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${excelData.length} productos a Excel`,
    })
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="discontinued">Descontinuado</SelectItem>
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
