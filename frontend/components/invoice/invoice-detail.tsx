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

// Datos de ejemplo para facturas
const mockInvoices: InvoiceData[] = [
  {
    id: "INV-1001",
    number: "0001-00000001",
    type: "A",
    date: new Date(2023, 6, 15),
    customer: {
      id: "5",
      name: "Empresa ABC S.A.",
      documentType: "CUIT",
      documentNumber: "30712345678",
      email: "contacto@empresaabc.com",
      address: "Av. Córdoba 1234, CABA",
      taxCondition: "Responsable Inscripto",
      taxId: "30-71234567-8",
    },
    items: [
      {
        id: "1",
        name: "Camisa Azul Slim Fit",
        price: 29.99,
        currency: "USD",
        quantity: 5,
        tax: 31.49,
        taxRate: 21,
        discount: 0,
        total: 181.44,
      },
    ],
    subtotal: 149.95,
    tax: 31.49,
    total: 181.44,
    cae: "73628193827192",
    caeExpirationDate: new Date(2023, 6, 25),
    currency: "USD",
  },
  {
    id: "INV-1002",
    number: "0001-00000002",
    type: "B",
    date: new Date(2023, 6, 16),
    customer: {
      id: "2",
      name: "María González",
      documentType: "DNI",
      documentNumber: "30123456",
      email: "maria.gonzalez@example.com",
      address: "Av. Santa Fe 567, CABA",
      taxCondition: "Consumidor Final",
      taxId: "27-30123456-2",
    },
    items: [
      {
        id: "2",
        name: "Perfume Elegance",
        price: 59.99,
        currency: "USD",
        quantity: 1,
        tax: 12.6,
        taxRate: 21,
        discount: 0,
        total: 72.59,
      },
    ],
    subtotal: 59.99,
    tax: 12.6,
    total: 72.59,
    cae: "73628193827193",
    caeExpirationDate: new Date(2023, 6, 26),
    currency: "USD",
  },
]

interface InvoiceDetailProps {
  invoiceId: string
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter()
  const [invoice, setInvoice] = React.useState<InvoiceData | null>(null)

  // Simular carga de factura
  React.useEffect(() => {
    const foundInvoice = mockInvoices.find((inv) => inv.id === invoiceId)
    setInvoice(foundInvoice || null)
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

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Factura no encontrada</p>
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
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {invoice.currency === "USD" ? "USD" : "$"} {item.price.toFixed(2)}
                  </TableCell>
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      {invoice.currency === "USD" ? "USD" : "$"} {(item.price * item.quantity).toFixed(2)}
                    </TableCell>
                  )}
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      {invoice.currency === "USD" ? "USD" : "$"} {item.tax.toFixed(2)} ({item.taxRate}%)
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {invoice.currency === "USD" ? "USD" : "$"} {item.total.toFixed(2)}
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
                      {invoice.currency === "USD" ? "USD" : "$"} {invoice.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3}>IVA</TableCell>
                    <TableCell colSpan={1}></TableCell>
                    <TableCell className="text-right">
                      {invoice.currency === "USD" ? "USD" : "$"} {invoice.tax.toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={1}></TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>Subtotal</TableCell>
                  <TableCell className="text-right">
                    {invoice.currency === "USD" ? "USD" : "$"} {invoice.subtotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={showDetailedTax ? 5 : 3}>Total</TableCell>
                <TableCell className="text-right">
                  {invoice.currency === "USD" ? "USD" : "$"} {invoice.total.toFixed(2)}
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
