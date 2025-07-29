"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Minus, Plus, Trash2, Percent, DollarSign, CreditCard, Banknote } from "lucide-react"
import type { CartItem } from "@/components/pos/pos-interface"

interface CartSummaryProps {
  items: CartItem[]
  totals: {
    subtotal: number
    tax: number
    total: number
  }
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  documentType: "ticket" | "factura"
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia"
  onPaymentMethodChange?: (method: "efectivo" | "tarjeta" | "transferencia") => void
  discount?: number
  onDiscountChange?: (discount: number) => void
}

export function CartSummary({
  items,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  documentType,
  paymentMethod = "efectivo",
  onPaymentMethodChange,
  discount = 0,
  onDiscountChange,
}: CartSummaryProps) {
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = React.useState(false)
  const [tempDiscount, setTempDiscount] = React.useState(discount)
  const [discountType, setDiscountType] = React.useState<"percentage" | "amount">("percentage")

  // Calcular totales con descuento
  const subtotalWithDiscount = totals.subtotal - discount
  const finalTotal = Math.max(0, subtotalWithDiscount + totals.tax)

  const handleApplyDiscount = () => {
    if (onDiscountChange) {
      let finalDiscount = tempDiscount

      if (discountType === "percentage") {
        // Convertir porcentaje a monto
        finalDiscount = (totals.subtotal * tempDiscount) / 100
      }

      // Validar que el descuento no sea mayor al subtotal
      finalDiscount = Math.min(finalDiscount, totals.subtotal)

      onDiscountChange(finalDiscount)
    }
    setIsDiscountDialogOpen(false)
  }

  const handleRemoveDiscount = () => {
    if (onDiscountChange) {
      onDiscountChange(0)
    }
    setTempDiscount(0)
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Trash2 className="h-8 w-8" />
          </div>
          <p className="text-lg font-medium">Carrito vacío</p>
          <p className="text-sm">Agrega productos para comenzar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Método de pago */}
      <div className="p-4 border-b">
        <Label className="text-sm font-medium mb-2 block">Método de Pago</Label>
        <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Efectivo
              </div>
            </SelectItem>
            <SelectItem value="tarjeta">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Tarjeta
              </div>
            </SelectItem>
            <SelectItem value="transferencia">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Transferencia
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de productos */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{item.name}</h4>
                <p className="text-xs text-muted-foreground">${item.price.toLocaleString("es-AR")} c/u</p>
                {item.category && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {item.category}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium">${item.total.toLocaleString("es-AR")}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveItem(item.id)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Resumen y totales */}
      <div className="p-4 border-t space-y-3">
        {/* Descuento (solo para efectivo) */}
        {paymentMethod === "efectivo" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Descuento</Label>
              <div className="flex items-center gap-2">
                {discount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveDiscount} className="h-6 px-2 text-xs">
                    Quitar
                  </Button>
                )}
                <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 bg-transparent">
                      <Percent className="h-3 w-3 mr-1" />
                      {discount > 0 ? `$${discount.toLocaleString("es-AR")}` : "Aplicar"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Aplicar Descuento</DialogTitle>
                      <DialogDescription>Aplica un descuento a la venta en efectivo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo de descuento</Label>
                        <Select
                          value={discountType}
                          onValueChange={(value) => setDiscountType(value as "percentage" | "amount")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                            <SelectItem value="amount">Monto fijo ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{discountType === "percentage" ? "Porcentaje" : "Monto"}</Label>
                        <Input
                          type="number"
                          value={tempDiscount}
                          onChange={(e) => setTempDiscount(Number(e.target.value))}
                          placeholder={discountType === "percentage" ? "0" : "0.00"}
                          min="0"
                          max={discountType === "percentage" ? "100" : totals.subtotal}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleApplyDiscount}>Aplicar Descuento</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Totales */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${totals.subtotal.toLocaleString("es-AR")}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span>-${discount.toLocaleString("es-AR")}</span>
            </div>
          )}

          {documentType === "factura" && totals.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span>IVA:</span>
              <span>${totals.tax.toLocaleString("es-AR")}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-base font-bold">
            <span>Total:</span>
            <span>${finalTotal.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
