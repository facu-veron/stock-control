"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

export function DailySalesCard() {
  const [dailySales, setDailySales] = React.useState(0)

  React.useEffect(() => {
    // Calcular ventas del día actual
    const calculateDailySales = () => {
      try {
        const invoiceHistory = JSON.parse(localStorage.getItem("invoiceHistory") || "[]")
        const today = new Date().toISOString().split("T")[0]

        const todaySales = invoiceHistory
          .filter((invoice: any) => {
            const invoiceDate = new Date(invoice.date).toISOString().split("T")[0]
            return invoiceDate === today
          })
          .reduce((total: number, invoice: any) => total + invoice.total, 0)

        setDailySales(todaySales)
      } catch (error) {
        console.error("Error al calcular ventas del día:", error)
      }
    }

    calculateDailySales()

    // Actualizar cada 30 segundos
    const interval = setInterval(calculateDailySales, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${dailySales.toLocaleString("es-AR")}</div>
        <p className="text-xs text-muted-foreground">Ventas de hoy en pesos argentinos</p>
      </CardContent>
    </Card>
  )
}
