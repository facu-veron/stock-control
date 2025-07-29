"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const initialData = [
  { name: "Ropa", value: 45 },
  { name: "Perfumes", value: 25 },
  { name: "Calzado", value: 15 },
  { name: "Accesorios", value: 10 },
  { name: "Joyería", value: 5 },
]

export function SalesByCategoryChart() {
  const [data, setData] = React.useState(initialData)

  // Cargar datos de ventas por categoría (simulado)
  React.useEffect(() => {
    try {
      const invoiceHistory = JSON.parse(localStorage.getItem("invoiceHistory") || "[]")

      if (invoiceHistory.length > 0) {
        // Calcular ventas por categoría
        const categorySales: Record<string, number> = {}

        invoiceHistory.forEach((invoice: any) => {
          invoice.items.forEach((item: any) => {
            const category = item.category || "Otros"
            if (categorySales[category]) {
              categorySales[category] += item.total
            } else {
              categorySales[category] = item.total
            }
          })
        })

        // Convertir a formato para gráfico
        const chartData = Object.entries(categorySales).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2)),
        }))

        if (chartData.length > 0) {
          setData(chartData)
        }
      }
    } catch (error) {
      console.error("Error al cargar datos de ventas por categoría:", error)
    }
  }, [])

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Ventas"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
