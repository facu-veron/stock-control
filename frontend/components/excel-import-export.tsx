"use client"

import * as React from "react"
import { FileSpreadsheet, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ExcelImportButton() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo Excel para importar.",
        variant: "destructive",
      })
      return
    }

    // Aquí iría la lógica real para procesar el archivo Excel
    toast({
      title: "Importando datos",
      description: `Procesando archivo: ${file.name}`,
    })

    // Simular procesamiento
    setTimeout(() => {
      toast({
        title: "Importación completada",
        description: "Los datos se han importado correctamente.",
      })
      setIsOpen(false)
      setFile(null)
    }, 1500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar datos desde Excel</DialogTitle>
          <DialogDescription>
            Selecciona un archivo Excel (.xlsx) con la estructura adecuada para importar los datos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="excel-file" className="col-span-4">
              Archivo Excel
            </Label>
            <div className="col-span-4">
              <Input id="excel-file" type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} />
            </div>
          </div>
          {file && (
            <div className="rounded-md bg-muted p-2 text-sm">
              <p>
                <strong>Archivo seleccionado:</strong> {file.name}
              </p>
              <p>
                <strong>Tamaño:</strong> {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExcelExportButton() {
  const handleExport = () => {
    // Aquí iría la lógica real para exportar a Excel
    toast({
      title: "Exportando datos",
      description: "Generando archivo Excel con los datos actuales...",
    })

    // Simular procesamiento
    setTimeout(() => {
      toast({
        title: "Exportación completada",
        description: "El archivo Excel se ha generado correctamente.",
      })
    }, 1500)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Exportar Excel
    </Button>
  )
}

export function ExcelImportExport() {
  return (
    <div className="flex gap-2">
      <ExcelImportButton />
      <ExcelExportButton />
    </div>
  )
}
