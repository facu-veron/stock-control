"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Receipt, Zap, CheckCircle2 } from "lucide-react"
import * as React from "react"

interface InvoiceProcessingProps {
  documentType: "ticket" | "factura"
}

export function InvoiceProcessing({ documentType }: InvoiceProcessingProps) {
  const [progress, setProgress] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState(0)

  const steps =
    documentType === "factura"
      ? [
          { label: "Validando datos", description: "Verificando información del cliente y productos" },
          { label: "Conectando con AFIP", description: "Estableciendo conexión segura" },
          { label: "Solicitando CAE", description: "Obteniendo Código de Autorización Electrónica" },
          { label: "Generando factura", description: "Creando documento fiscal" },
          { label: "Finalizando", description: "Guardando información y actualizando stock" },
        ]
      : [
          { label: "Validando datos", description: "Verificando información de productos" },
          { label: "Generando ticket", description: "Creando comprobante de venta" },
          { label: "Finalizando", description: "Guardando información y actualizando stock" },
        ]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (documentType === "factura" ? 2 : 4)

        // Actualizar paso actual basado en el progreso
        const stepProgress = 100 / steps.length
        const newStep = Math.floor(newProgress / stepProgress)
        setCurrentStep(Math.min(newStep, steps.length - 1))

        return Math.min(newProgress, 100)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [documentType, steps.length])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {documentType === "factura" ? (
                <FileText className="h-8 w-8 text-primary" />
              ) : (
                <Receipt className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">
              {documentType === "factura" ? "Procesando Factura" : "Generando Ticket"}
            </CardTitle>
            <CardDescription>
              {documentType === "factura"
                ? "Comunicándose con AFIP para obtener la autorización"
                : "Procesando la venta y actualizando el inventario"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Barra de progreso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Pasos del proceso */}
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = index < currentStep
                const isPending = index > currentStep

                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium ${
                          isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    </div>
                    {isActive && (
                      <Badge variant="outline" className="ml-2">
                        <Zap className="h-3 w-3 mr-1" />
                        En proceso
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Información adicional */}
            {documentType === "factura" && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Factura Electrónica AFIP</span>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  Este proceso puede tomar unos segundos mientras se obtiene la autorización fiscal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
