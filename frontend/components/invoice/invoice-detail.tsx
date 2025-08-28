"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Printer, Mail, FileText } from "lucide-react"
import { QRCode } from "@/components/pos/qr-code"
import { useRouter } from "next/navigation"
import type { InvoiceData } from "@/components/pos/pos-interface"
import { getSaleById } from "@/lib/api"

// Datos de respaldo en caso de error
const fallbackInvoice = {
  id: "fallback",
  number: "0000-00000000",
  type: "TICKET",
  date: new Date(),
  customer: null,
  employee: null,
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  cae: "Sin CAE",
  caeExpirationDate: new Date(),
  currency: "ARS",
  status: "error"
}

interface InvoiceDetailProps {
  invoiceId: string
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter()
  const [invoice, setInvoice] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Cargar factura real desde la API
  React.useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true)
        setError(null)
        const sale = await getSaleById(invoiceId)
        
        // Transformar los datos de venta al formato esperado por el componente
        const transformedInvoice = {
          id: sale.id,
          number: sale.saleNumber || sale.cbteNro ? `0001-${String(sale.cbteNro).padStart(8, '0')}` : sale.saleNumber,
          type: sale.cbteTipo === 1 ? "A" : sale.cbteTipo === 6 ? "B" : sale.cbteTipo === 11 ? "C" : "TICKET",
          date: new Date(sale.createdAt),
          customer: sale.customer,
          employee: sale.employee,
          items: sale.items.map((item: any): any => ({
            id: item.id,
            name: item.productName || item.product?.name,
            price: Number(item.unitPrice) || 0,
            quantity: Number(item.quantity) || 0,
            tax: Number(item.lineTotal) * (Number(item.ivaRate) / 100) || 0,
            taxRate: Number(item.ivaRate) || 21,
            discount: Number(item.discount) || 0,
            total: Number(item.lineTotal) || 0,
          })),
          subtotal: Number(sale.subtotal) || 0,
          tax: Number(sale.taxTotal) || 0,
          total: Number(sale.grandTotal) || 0,
          cae: sale.cae || "Sin CAE",
          caeExpirationDate: sale.caeVto ? new Date(sale.caeVto) : new Date(),
          currency: "ARS",
          status: sale.status
        }
        
        setInvoice(transformedInvoice)
      } catch (err) {
        console.error("Error cargando factura:", err)
        setError("Error al cargar la factura")
        // Usar datos de respaldo si hay error
        setInvoice(fallbackInvoice)
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId])

  // Generar datos para el QR (simulado)
  const qrData = React.useMemo(() => {
    if (!invoice) return ""

    // Formato según AFIP para código QR
    const qrInfo = {
      ver: 1,
      fecha: invoice.date.toISOString().split("T")[0],
      cuit: 30123456789, // CUIT del emisor (ejemplo)
      ptoVta: 1,
      tipoCmp: invoice.type === "A" ? 1 : invoice.type === "B" ? 6 : 11,
      nroCmp: Number.parseInt(invoice.number.split("-")[1]),
      importe: invoice.total,
      moneda: invoice.currency === "USD" ? "DOL" : "PES",
      ctz: 1,
      tipoDocRec: 80,
      nroDocRec: invoice.customer.taxId.replace(/-/g, ""),
      tipoCodAut: "E",
      codAut: invoice.cae,
    }

    // En una implementación real, esto se codificaría en base64
    return JSON.stringify(qrInfo)
  }, [invoice])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Cargando factura...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{error || "Factura no encontrada"}</p>
      </div>
    )
  }

  // Determinar si se debe discriminar IVA
  const showDetailedTax = invoice.type === "A"

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" className="mr-4" onClick={() => router.push("/facturas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              Factura {invoice.type} - {invoice.number}
            </h2>
            <p className="text-muted-foreground">Emitida el {invoice.date.toLocaleDateString()}</p>
          </div>
        </div>
        <Badge className="text-lg py-1 px-3">
          {invoice.type === "A" ? "IVA Discriminado" : invoice.type === "B" ? "Consumidor Final" : "Monotributo"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Datos del Cliente</CardTitle>
            <CardDescription>Información fiscal del cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Nombre:</div>
                  <div className="col-span-2">{invoice.customer.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">CUIT/CUIL:</div>
                  <div className="col-span-2">{invoice.customer.taxId}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Condición IVA:</div>
                  <div className="col-span-2">{invoice.customer.taxCondition}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Dirección:</div>
                  <div className="col-span-2">{invoice.customer.address}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Email:</div>
                  <div className="col-span-2">{invoice.customer.email}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Documento:</div>
                  <div className="col-span-2">
                    {invoice.customer.documentType} {invoice.customer.documentNumber}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos Fiscales</CardTitle>
            <CardDescription>Información de AFIP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1">
                <div className="text-sm font-medium">CAE:</div>
                <div className="col-span-2 font-mono text-xs">{invoice.cae}</div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="text-sm font-medium">Vto. CAE:</div>
                <div className="col-span-2">{invoice.caeExpirationDate.toLocaleDateString()}</div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="text-sm font-medium">Moneda:</div>
                <div className="col-span-2">{invoice.currency === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}</div>
              </div>
              <div className="mt-4 flex justify-center">
                <QRCode value={qrData} size={100} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detalle de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                {showDetailedTax && <TableHead className="text-right">Neto</TableHead>}
                {showDetailedTax && <TableHead className="text-right">IVA</TableHead>}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    $ {(item.price || 0).toFixed(2)}
                  </TableCell>
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      $ {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                    </TableCell>
                  )}
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      $ {(item.tax || 0).toFixed(2)} ({item.taxRate || 21}%)
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    $ {(item.total || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {showDetailedTax ? (
                <>
                  <TableRow>
                    <TableCell colSpan={3}>Subtotal</TableCell>
                    <TableCell className="text-right">
                      $ {(invoice.subtotal || 0).toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3}>IVA</TableCell>
                    <TableCell colSpan={1}></TableCell>
                    <TableCell className="text-right">
                      $ {(invoice.tax || 0).toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={1}></TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>Subtotal</TableCell>
                  <TableCell className="text-right">
                    $ {(invoice.subtotal || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={showDetailedTax ? 5 : 3}>Total</TableCell>
                <TableCell className="text-right">
                  $ {(invoice.total || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push("/facturas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Enviar por Email
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
