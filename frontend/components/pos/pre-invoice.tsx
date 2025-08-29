"use client"
import { Button } from "@/components/ui/button"
import type { CartItem, InvoiceType } from "@/components/pos/pos-interface"
import type { User as Employee, Customer } from "@/lib/api"
import { TAX_CONDITION_LABELS } from "@/lib/afip-types"

import { ArrowLeft, FileText, AlertCircle, Receipt, Banknote, CreditCard, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface PreInvoiceProps {
  cart: CartItem[]
  customer: Customer | null
  employee: Employee
  totals: {
    subtotal: number
    tax: number
    total: number
  }
  invoiceType: InvoiceType
  documentType: "ticket" | "factura"
  paymentMethod: "efectivo" | "tarjeta" | "transferencia"
  discount: number
  onBack: () => void
  onConfirm: () => void
}

export function PreInvoice({
  cart,
  customer,
  employee,
  totals,
  invoiceType,
  documentType,
  paymentMethod,
  discount,
  onBack,
  onConfirm,
}: PreInvoiceProps) {
  // ✅ Determinar si se debe discriminar IVA usando tipos estandarizados
  const showDetailedTax = documentType === "factura" && invoiceType === "FACTURA_A"

  // Calcular totales con descuento
  const subtotalWithDiscount = Math.max(0, totals.subtotal - discount)
  const finalTotal = subtotalWithDiscount + totals.tax

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case "efectivo":
        return <Banknote className="h-4 w-4" />
      case "tarjeta":
        return <CreditCard className="h-4 w-4" />
      case "transferencia":
        return <DollarSign className="h-4 w-4" />
      default:
        return <Banknote className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case "efectivo":
        return "Efectivo"
      case "tarjeta":
        return "Tarjeta"
      case "transferencia":
        return "Transferencia"
      default:
        return "Efectivo"
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" className="mr-4 bg-transparent" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">{documentType === "ticket" ? "Pre-Ticket" : "Pre-Factura"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-lg py-1 px-3">
            {documentType === "ticket" ? (
              <>
                <Receipt className="h-4 w-4 mr-1" />
                Ticket
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1" />
                Factura {invoiceType?.replace('FACTURA_', '') || invoiceType}
              </>
            )}
          </Badge>
          <Badge variant="outline" className="text-lg py-1 px-3">
            {getPaymentMethodIcon()}
            <span className="ml-1">{getPaymentMethodLabel()}</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Empleado</CardTitle>
            <CardDescription>Empleado que realiza la venta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1">
                <div className="text-sm font-medium">Nombre:</div>
                <div className="col-span-2">{employee.name}</div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="text-sm font-medium">Rol:</div>
                <div className="col-span-2">
                  <Badge variant={employee.role === "ADMIN" ? "default" : "outline"}>
                    {employee.role === "ADMIN" ? "Administrador" : "Empleado"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {customer ? (
          <Card>
            <CardHeader>
              <CardTitle>Datos del Cliente</CardTitle>
              <CardDescription>Información fiscal del cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Nombre:</div>
                  <div className="col-span-2">{customer.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">CUIT/CUIL:</div>
                  <div className="col-span-2">{customer.taxId}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Condición IVA:</div>
                  <div className="col-span-2">
                    {TAX_CONDITION_LABELS[customer.taxStatus] || customer.taxCondition || customer.taxStatus}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Dirección:</div>
                  <div className="col-span-2">{customer.address}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Email:</div>
                  <div className="col-span-2">{customer.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ticket para Consumidor Final</CardTitle>
              <CardDescription>Venta sin datos del cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Tipo:</div>
                  <div className="col-span-2">Ticket Fiscal</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Cliente:</div>
                  <div className="col-span-2">Consumidor Final</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Fecha:</div>
                  <div className="col-span-2">{new Date().toLocaleDateString()}</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-sm font-medium">Moneda:</div>
                  <div className="col-span-2">Pesos Argentinos (ARS)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
              {cart.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${(Number(item.price) || 0).toLocaleString("es-AR")}</TableCell>
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      ${((Number(item.price) || 0) * item.quantity).toLocaleString("es-AR")}
                    </TableCell>
                  )}
                  {showDetailedTax && (
                    <TableCell className="text-right">
                      ${(Number(item.tax) || 0).toLocaleString("es-AR")} ({Number(item.taxRate) || 0}%)
                    </TableCell>
                  )}
                  <TableCell className="text-right">${(Number(item.total) || 0).toLocaleString("es-AR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {showDetailedTax ? (
                <>
                  <TableRow>
                    <TableCell colSpan={3}>Subtotal</TableCell>
                    <TableCell className="text-right">${totals.subtotal.toLocaleString("es-AR")}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                  {discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>Descuento</TableCell>
                      <TableCell className="text-right text-green-600">-${discount.toLocaleString("es-AR")}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={3}>IVA</TableCell>
                    <TableCell colSpan={1}></TableCell>
                    <TableCell className="text-right">${totals.tax.toLocaleString("es-AR")}</TableCell>
                    <TableCell colSpan={1}></TableCell>
                  </TableRow>
                </>
              ) : (
                <>
                  <TableRow>
                    <TableCell colSpan={3}>Subtotal</TableCell>
                    <TableCell className="text-right">${totals.subtotal.toLocaleString("es-AR")}</TableCell>
                  </TableRow>
                  {discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>Descuento</TableCell>
                      <TableCell className="text-right text-green-600">-${discount.toLocaleString("es-AR")}</TableCell>
                    </TableRow>
                  )}
                </>
              )}
              <TableRow>
                <TableCell colSpan={showDetailedTax ? 5 : 3}>Total</TableCell>
                <TableCell className="text-right font-bold">${finalTotal.toLocaleString("es-AR")}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          {documentType === "ticket"
            ? "Verifique que todos los datos sean correctos antes de confirmar. El ticket se emitirá sin registrar en AFIP."
            : "Verifique que todos los datos sean correctos antes de confirmar. Una vez emitida la factura no podrá modificarse."}
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={onConfirm} className="gap-2">
          {documentType === "ticket" ? (
            <>
              <Receipt className="h-4 w-4" />
              Confirmar y Emitir Ticket
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Confirmar y Facturar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
