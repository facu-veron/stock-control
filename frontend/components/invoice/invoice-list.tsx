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
import { ArrowUpDown, MoreHorizontal, Mail, Printer, Eye, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { InvoiceData } from "@/components/pos/pos-interface"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getSales } from "@/lib/api"

// Función para transformar datos de venta a formato de factura
const transformSaleToInvoice = (sale: any): any => {
  return {
    id: sale.id,
    number: sale.saleNumber || (sale.cbteNro ? `0001-${String(sale.cbteNro).padStart(8, '0')}` : sale.saleNumber),
    type: sale.cbteTipo === 1 ? "A" : sale.cbteTipo === 6 ? "B" : sale.cbteTipo === 11 ? "C" : "TICKET",
    date: new Date(sale.createdAt),
    customer: sale.customer,
    employee: sale.employee,
    items: sale.items?.map((item: any) => ({
      id: item.id,
      name: item.productName || item.product?.name,
      price: Number(item.unitPrice) || 0,
      quantity: Number(item.quantity) || 0,
      tax: Number(item.lineTotal) * (Number(item.ivaRate) / 100) || 0,
      taxRate: Number(item.ivaRate) || 21,
      discount: Number(item.discount) || 0,
      total: Number(item.lineTotal) || 0,
      category: item.product?.category?.name || "Sin categoría",
    })) || [],
    subtotal: Number(sale.subtotal) || 0,
    tax: Number(sale.taxTotal) || 0,
    total: Number(sale.grandTotal) || 0,
    cae: sale.cae || "Sin CAE",
    caeExpirationDate: sale.caeVto ? new Date(sale.caeVto) : new Date(),
    status: sale.status === "CONFIRMED" ? "completed" : sale.status === "DRAFT" ? "pending" : "error"
  }
}

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "number",
    header: "Número",
    cell: ({ row }) => <div>{row.getValue("number")}</div>,
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => <Badge variant="outline">Factura {row.getValue("type")}</Badge>,
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("date") as Date
      return <div>{date.toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: "customer",
    header: "Cliente",
    cell: ({ row }) => {
      const customer = row.original.customer
      return <div>{customer ? customer.name : "Cliente no especificado"}</div>
    },
  },
  {
    accessorKey: "employee",
    header: "Empleado",
    cell: ({ row }) => {
      const employee = row.original.employee
      return <div>{employee ? employee.name : "Empleado no especificado"}</div>
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const totalValue = row.getValue("total")
      const amount = Number(totalValue) || 0
      const formatted = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "cae",
    header: "CAE",
    cell: ({ row }) => {
      const cae = row.getValue("cae") as string
      return <div className="font-mono text-xs">{cae || "N/A"}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "completed"
      return (
        <div>
          {status === "completed" ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              Completada
            </Badge>
          ) : status === "pending" ? (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
              Pendiente
            </Badge>
          ) : (
            <Badge variant="destructive">Error</Badge>
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original
      const router = useRouter()
      const [openEmailDialog, setOpenEmailDialog] = React.useState(false)

      const handleSendEmail = (email: string) => {
        toast({
          title: "Factura enviada",
          description: `La factura ${invoice.number} ha sido enviada a ${email}`,
        })
        setOpenEmailDialog(false)
      }

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/facturas/${invoice.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenEmailDialog(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar por Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={openEmailDialog} onOpenChange={setOpenEmailDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Enviar Factura por Email</DialogTitle>
                <DialogDescription>
                  Ingrese el correo electrónico al que desea enviar la factura {invoice.number}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input id="email" defaultValue={invoice.customer?.email || ""} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={() => handleSendEmail(invoice.customer?.email || "")}>
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )
    },
  },
]

export function InvoiceList() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [searchTerm, setSearchTerm] = React.useState("")
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Cargar facturas reales desde la API
  React.useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true)
        setError(null)
        const sales = await getSales()
        const transformedInvoices = sales.map(transformSaleToInvoice)
        setInvoices(transformedInvoices)
      } catch (err) {
        console.error("Error cargando facturas:", err)
        setError("Error al cargar facturas")
        setInvoices([])
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [])

  // Filtrar facturas por fecha
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((invoice) => {
      // Filtro por fecha
      if (dateRange.from && dateRange.to) {
        const invoiceDate = new Date(invoice.date)
        return invoiceDate >= dateRange.from && invoiceDate <= dateRange.to
      }
      return true
    })
  }, [invoices, dateRange])

  const table = useReactTable({
    data: filteredInvoices,
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

  // Filtrar facturas por término de búsqueda
  React.useEffect(() => {
    if (searchTerm) {
      table.getColumn("customer")?.setFilterValue(searchTerm)
    } else {
      table.getColumn("customer")?.setFilterValue("")
    }
  }, [searchTerm, table])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p>Cargando facturas...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full md:w-40"
              onChange={(e) => table.getColumn("type")?.setFilterValue(e.target.value || undefined)}
            >
              <option value="">Todos los tipos</option>
              <option value="A">Factura A</option>
              <option value="B">Factura B</option>
              <option value="C">Factura C</option>
            </select>
          </div>
          <CalendarDateRangePicker className="w-auto" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    No se encontraron facturas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Mostrando {table.getFilteredRowModel().rows.length} de {invoices.length} facturas.
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
  )
}
