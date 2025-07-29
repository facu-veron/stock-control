"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Employee } from "@/components/pos/pos-interface"

interface EmployeeSalesData {
  employee: Employee
  todaySales: number
  todayTransactions: number
  monthSales: number
  monthTransactions: number
}

export function EmployeeSalesReport() {
  const [employeeSales, setEmployeeSales] = React.useState<EmployeeSalesData[]>([])

  React.useEffect(() => {
    const loadEmployeeSales = () => {
      try {
        const employeeSalesData = JSON.parse(localStorage.getItem("employeeSales") || "{}")
        const employees = [
          { id: "1", name: "Juan Pérez", pin: "1234", role: "admin" as const, isActive: true },
          { id: "2", name: "María González", pin: "5678", role: "employee" as const, isActive: true },
          { id: "3", name: "Carlos Rodríguez", pin: "9999", role: "employee" as const, isActive: true },
          { id: "4", name: "Ana Martínez", pin: "0000", role: "admin" as const, isActive: true },
        ]

        const today = new Date().toISOString().split("T")[0]
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

        const salesReport = employees.map((employee) => {
          const employeeData = employeeSalesData[employee.id] || {}
          const todayData = employeeData[today] || { totalAmount: 0, totalTransactions: 0 }

          // Calcular ventas del mes
          let monthSales = 0
          let monthTransactions = 0

          Object.keys(employeeData).forEach((date) => {
            if (date.startsWith(currentMonth)) {
              monthSales += employeeData[date].totalAmount || 0
              monthTransactions += employeeData[date].totalTransactions || 0
            }
          })

          return {
            employee,
            todaySales: todayData.totalAmount,
            todayTransactions: todayData.totalTransactions,
            monthSales,
            monthTransactions,
          }
        })

        setEmployeeSales(salesReport)
      } catch (error) {
        console.error("Error al cargar datos de ventas de empleados:", error)
      }
    }

    loadEmployeeSales()

    // Actualizar cada minuto
    const interval = setInterval(loadEmployeeSales, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de Ventas por Empleado</CardTitle>
        <CardDescription>Ventas del día y del mes por empleado</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Ventas Hoy</TableHead>
              <TableHead className="text-right">Trans. Hoy</TableHead>
              <TableHead className="text-right">Ventas Mes</TableHead>
              <TableHead className="text-right">Trans. Mes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeeSales.map((data) => (
              <TableRow key={data.employee.id}>
                <TableCell className="font-medium">{data.employee.name}</TableCell>
                <TableCell>
                  <Badge variant={data.employee.role === "admin" ? "default" : "outline"}>
                    {data.employee.role === "admin" ? "Admin" : "Empleado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">${data.todaySales.toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">{data.todayTransactions}</TableCell>
                <TableCell className="text-right">${data.monthSales.toLocaleString("es-AR")}</TableCell>
                <TableCell className="text-right">{data.monthTransactions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
