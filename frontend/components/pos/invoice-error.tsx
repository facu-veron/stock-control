"use client"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"

interface InvoiceErrorProps {
  errorMessage: string
  onRetry: () => void
  onCancel: () => void
}

export function InvoiceError({ errorMessage, onRetry, onCancel }: InvoiceErrorProps) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-[500px]">
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-center">Error en la Facturación</h2>
            <p className="text-center text-muted-foreground">{errorMessage}</p>
            <div className="w-full rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                No se pudo completar la facturación electrónica. Esto puede deberse a problemas de conexión con AFIP o a
                un error en los datos ingresados.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
