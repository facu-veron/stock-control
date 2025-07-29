"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Printer, Mail, Eye, Plus, Download } from "lucide-react"
import { QRCode } from "@/components/pos/qr-code"
import type { InvoiceData } from "./pos-interface"

type InvoiceSuccessProps = {
  invoiceData: InvoiceData
  onNewSale: () => void
  onViewInvoice: () => void
  canViewInvoice?: boolean
}

export function InvoiceSuccess({ invoiceData, onNewSale, onViewInvoice, canViewInvoice = true }: InvoiceSuccessProps) {
  const isTicket = invoiceData.type === "TICKET"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header de éxito */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            {isTicket ? "¡Ticket Generado!" : "¡Factura Generada!"}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            {isTicket
              ? "El ticket de venta se ha generado correctamente"
              : "La factura electrónica se ha emitido correctamente"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información del documento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant={isTicket ? "secondary" : "default"}>
                {isTicket ? "TICKET" : `Factura ${invoiceData.type}`}
              </Badge>
              {invoiceData.number}
            </CardTitle>
            <CardDescription>
              Fecha: {invoiceData.date.toLocaleDateString()} - {invoiceData.date.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Información del cliente */}
            {invoiceData.customer && (
              <div>
                <h4 className="font-medium mb-2">Cliente</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{invoiceData.customer.name}</p>
                  <p>{invoiceData.customer.taxCondition}</p>
                  <p>{invoiceData.customer.taxId}</p>
                </div>
              </div>
            )}

            {/* Información del empleado */}
            <div>
              <h4 className="font-medium mb-2">Vendedor</h4>
              <div className="text-sm text-muted-foreground">
                <p>{invoiceData.employee.name}</p>
                <p>{invoiceData.employee.role === "admin" ? "Administrador" : "Empleado"}</p>
              </div>
            </div>

            {/* CAE (solo para facturas) */}
            {!isTicket && invoiceData.cae && (
              <div>
                <h4 className="font-medium mb-2">CAE</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-mono">{invoiceData.cae}</p>
                  <p>Vence: {invoiceData.caeExpirationDate?.toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de la venta */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-2">
              {invoiceData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.quantity} x ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">${item.total.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totales */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              {invoiceData.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>IVA (21%):</span>
                  <span>${invoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${invoiceData.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code (solo para facturas) */}
      {!isTicket && (
        <Card>
          <CardHeader>
            <CardTitle>Código QR</CardTitle>
            <CardDescription>Código QR para verificación en AFIP</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <QRCode
              value={`https://www.afip.gob.ar/fe/qr/?p=${btoa(
                JSON.stringify({
                  ver: 1,
                  fecha: invoiceData.date.toISOString().split("T")[0],
                  cuit: "20123456789",
                  ptoVta: 1,
                  tipoCmp: invoiceData.type === "A" ? 1 : 6,
                  nroCmp: Number.parseInt(invoiceData.number.split("-")[1]),
                  importe: invoiceData.total,
                  moneda: "PES",
                  ctz: 1,
                  tipoDocRec: invoiceData.customer?.documentType === "CUIT" ? 80 : 96,
                  nroDocRec: invoiceData.customer?.documentNumber,
                  tipoCodAut: "E",
                  codAut: invoiceData.cae,
                }),
              )}`}
              size={200}
            />
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={onNewSale} size="lg" className="flex-1 min-w-[200px]">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>

            <Button variant="outline" size="lg" className="flex-1 min-w-[200px] bg-transparent">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>

            {canViewInvoice && (
              <Button
                variant="outline"
                onClick={onViewInvoice}
                size="lg"
                className="flex-1 min-w-[200px] bg-transparent"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </Button>
            )}

            <Button variant="outline" size="lg" className="flex-1 min-w-[200px] bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>

            {invoiceData.customer?.email && (
              <Button variant="outline" size="lg" className="flex-1 min-w-[200px] bg-transparent">
                <Mail className="mr-2 h-4 w-4" />
                Enviar por Email
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
