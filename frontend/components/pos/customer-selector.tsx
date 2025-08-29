"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
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
import type { Customer, CreateCustomerRequest } from "@/lib/api"
import { UserRound, Search, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getCustomers, createCustomer } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  type DocumentTypeUI,
  type TaxConditionUI,
  TAX_CONDITION_OPTIONS,
  POS_DOCUMENT_TYPE_OPTIONS,
  TAX_CONDITION_LABELS,
  validateDocumentTypeForTaxCondition,
  formatDocumentNumber,
  formatDocumentForAPI,
  validateDocumentNumber,
} from "@/lib/afip-types"

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer) => void
  selectedCustomer: Customer | null
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newCustomer, setNewCustomer] = React.useState<Partial<Customer>>({
    documentType: "DNI" as DocumentTypeUI,
    taxStatus: "CONSUMIDOR_FINAL" as TaxConditionUI,
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
  })
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Cargar clientes cuando se abre el diálogo
  React.useEffect(() => {
    if (open && !isAddingNew) {
      setLoading(true)
      setError(null)
      getCustomers()
        .then((data) => {
          setCustomers(data)
          setLoading(false)
        })
        .catch(() => {
          setError("Error al cargar clientes")
          setLoading(false)
        })
    }
  }, [open, isAddingNew])

  // Filtrar clientes por búsqueda
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.documentNumber && customer.documentNumber.includes(searchTerm)) ||
        (customer.taxId && customer.taxId.includes(searchTerm))
    )
  }, [searchTerm, customers])

  // Seleccionar cliente
  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setOpen(false)
  }

  // ✅ Auto-sincronizar campos cuando cambia el tipo de documento
  const handleDocumentTypeChange = (newDocumentType: DocumentTypeUI) => {
    console.log("🔍 Cambiando documentType a:", newDocumentType);
    
    setNewCustomer(prev => {
      const updated = { ...prev, documentType: newDocumentType };
      
      // ✅ Auto-ajustar taxStatus basado en documentType (lógica simplificada)
      if (newDocumentType === "CUIT") {
        updated.taxStatus = "RESPONSABLE_INSCRIPTO"; // CUIT siempre RI
        console.log("✅ CUIT seleccionado -> cambiando a RESPONSABLE_INSCRIPTO");
      } else if (newDocumentType === "DNI" || newDocumentType === "CF") {
        updated.taxStatus = "CONSUMIDOR_FINAL"; // DNI/CF siempre CF
        console.log("✅ DNI/CF seleccionado -> cambiando a CONSUMIDOR_FINAL");
      }
      
      // Limpiar número de documento al cambiar tipo
      updated.documentNumber = "";
      
      console.log("✅ Estado actualizado:", { 
        documentType: updated.documentType, 
        taxStatus: updated.taxStatus 
      });
      
      return updated;
    });
  }

  // ✅ Auto-sincronizar cuando cambia taxId
  const handleTaxIdChange = (newTaxId: string) => {
    setNewCustomer(prev => {
      const updated = { ...prev, taxId: newTaxId };
      
      // Si el tipo de documento es CUIT/CUIL, sincronizar documentNumber
      if ((prev.documentType === "CUIT" || prev.documentType === "CUIL") && newTaxId) {
        updated.documentNumber = newTaxId;
      }
      
      return updated;
    });
  }

  // ✅ Consultar datos fiscales (simulado - usando tipos estandarizados)
  const fetchTaxData = () => {
    if (!newCustomer.taxId) return

    // Simulación de consulta a AFIP con tipos estandarizados
    setTimeout(() => {
      if (newCustomer.taxId === "30-71234567-8") {
        setNewCustomer({
          ...newCustomer,
          name: "Empresa ABC S.A.",
          documentType: "CUIT" as DocumentTypeUI,
          documentNumber: "30-71234567-8", // ✅ Asegurar que documentNumber coincida
          taxStatus: "RESPONSABLE_INSCRIPTO" as TaxConditionUI,
          address: "Av. Córdoba 1234, CABA",
          email: "facturacion@empresaabc.com.ar",
        })
      } else if (newCustomer.taxId === "20-25789456-8") {
        setNewCustomer({
          ...newCustomer,
          name: "Carlos Rodríguez",
          documentType: "CUIL" as DocumentTypeUI,
          documentNumber: "20-25789456-8", // ✅ Asegurar que documentNumber coincida
          taxStatus: "MONOTRIBUTO" as TaxConditionUI,
          address: "Calle Lavalle 789, CABA",
          email: "carlos.rodriguez@email.com",
        })
      }
    }, 1000)
  }

  // ✅ Guardar nuevo cliente con validaciones
  const saveNewCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "Error de validación",
        description: "El nombre es requerido",
        variant: "destructive",
      })
      return
    }

    // ✅ Validar compatibilidad documentType y taxStatus
    if (newCustomer.documentType && newCustomer.taxStatus) {
      const validation = validateDocumentTypeForTaxCondition(
        newCustomer.documentType,
        newCustomer.taxStatus
      );
      if (!validation.valid) {
        toast({
          title: "Error de validación",
          description: validation.error,
          variant: "destructive",
        })
        return
      }
    }

    // ✅ Validar número de documento si existe
    if (newCustomer.documentNumber && newCustomer.documentType) {
      if (!validateDocumentNumber(newCustomer.documentNumber, newCustomer.documentType)) {
        toast({
          title: "Error de validación",
          description: "Número de documento inválido para el tipo seleccionado",
          variant: "destructive",
        })
        return
      }
    }

    // ✅ Para CUIT/CUIL, asegurar que documentNumber y taxId coincidan si están presentes
    if ((newCustomer.documentType === "CUIT" || newCustomer.documentType === "CUIL") && 
        newCustomer.taxId && newCustomer.documentNumber && 
        newCustomer.taxId !== newCustomer.documentNumber) {
      // Auto-sincronizar si taxId está completo pero documentNumber no
      if (!newCustomer.documentNumber && newCustomer.taxId) {
        setNewCustomer(prev => ({ ...prev, documentNumber: newCustomer.taxId }));
      } else {
        toast({
          title: "Error de validación",
          description: "El número de documento debe coincidir con el CUIT/CUIL ingresado",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // ✅ Formatear documentNumber para API (sin guiones)
      const formattedDocumentNumber = newCustomer.documentNumber 
        ? formatDocumentForAPI(newCustomer.documentNumber)
        : "";
      
      console.log("🔍 Enviando al API:", {
        documentType: newCustomer.documentType,
        documentNumber: newCustomer.documentNumber,
        formattedDocumentNumber,
        taxStatus: newCustomer.taxStatus
      });
      
      const customerData: CreateCustomerRequest = {
        name: newCustomer.name,
        documentType: newCustomer.documentType || "DNI",
        documentNumber: formattedDocumentNumber, // ✅ Sin guiones para API
        taxStatus: newCustomer.taxStatus || "CONSUMIDOR_FINAL",
        email: newCustomer.email || "",
        address: newCustomer.address || "",
        taxId: newCustomer.taxId,
      }

      const createdCustomer = await createCustomer(customerData)
      
      // ✅ Agregar taxCondition para compatibilidad
      const customerForUI: Customer = {
        ...createdCustomer,
        taxCondition: createdCustomer.taxStatus // Compatibilidad
      }
      
      // Actualizar la lista de clientes
      setCustomers(prev => [...prev, createdCustomer])
      
      // Seleccionar el cliente recién creado
      onSelectCustomer(customerForUI)
      
      // Resetear formulario
      setIsAddingNew(false)
      setNewCustomer({
        documentType: "DNI" as DocumentTypeUI,
        taxStatus: "CONSUMIDOR_FINAL" as TaxConditionUI,
      })
      setOpen(false)
      
      toast({
        title: "Cliente creado",
        description: `${createdCustomer.name} ha sido agregado correctamente`,
      })
    } catch (error) {
      setError("Error al crear cliente")
      toast({
        title: "Error al crear cliente",
        description: error instanceof Error ? error.message : "Error inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          {selectedCustomer ? selectedCustomer.name : "Seleccionar Cliente"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isAddingNew ? "Agregar Nuevo Cliente" : "Seleccionar Cliente"}</DialogTitle>
          <DialogDescription>
            {isAddingNew
              ? "Complete los datos del cliente para agregarlo al sistema."
              : "Busque y seleccione un cliente existente o agregue uno nuevo."}
          </DialogDescription>
        </DialogHeader>

        {!isAddingNew ? (
          <>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, DNI o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={() => {
                setIsAddingNew(true);
                // ✅ Reset formulario con valores válidos por defecto
                setNewCustomer({
                  documentType: "DNI" as DocumentTypeUI,
                  taxStatus: "CONSUMIDOR_FINAL" as TaxConditionUI,
                  documentNumber: "",
                  name: "",
                  email: "",
                  phone: "",
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-2">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Cargando clientes...</div>
              ) : filteredCustomers.length > 0 ? (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.documentType}: {customer.documentNumber} 
                          {customer.taxId && ` | CUIT/CUIL: ${customer.taxId}`}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground">
                            Email: {customer.email}
                          </div>
                        )}
                      </div>
                      <Badge>
                        {TAX_CONDITION_LABELS[customer.taxStatus] || customer.taxStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No se encontraron clientes con esa búsqueda
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-4">
            {/* ✅ Información de ayuda */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>💡 Ayuda:</strong> Ingrese el CUIT/CUIL en el primer campo y presione el botón de búsqueda 
                para autocompletar los datos. Para CUIT `30-71234567-8` hay datos de prueba disponibles.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">CUIT/CUIL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="taxId"
                    value={newCustomer.taxId || ""}
                    onChange={(e) => handleTaxIdChange(e.target.value)}
                    placeholder="XX-XXXXXXXX-X"
                  />
                  <Button variant="outline" size="icon" onClick={fetchTaxData}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxCondition">Condición frente al IVA</Label>
                <select
                  id="taxCondition"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newCustomer.taxStatus}
                  onChange={(e) => setNewCustomer({ ...newCustomer, taxStatus: e.target.value as TaxConditionUI })}
                >
                  {TAX_CONDITION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre o Razón Social</Label>
              <Input
                id="name"
                value={newCustomer.name || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de Documento</Label>
                <select
                  id="documentType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newCustomer.documentType}
                  onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentTypeUI)}
                >
                  {POS_DOCUMENT_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentNumber">
                  Número de Documento
                  {(newCustomer.documentType === "CUIT" || newCustomer.documentType === "CUIL") && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (se sincroniza con CUIT/CUIL)
                    </span>
                  )}
                </Label>
                <Input
                  id="documentNumber"
                  value={newCustomer.documentNumber || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, documentNumber: e.target.value })}
                  placeholder={
                    newCustomer.documentType === "DNI" ? "12.345.678" :
                    newCustomer.documentType === "CUIT" ? "30-12345678-9" :
                    newCustomer.documentType === "CUIL" ? "20-12345678-9" :
                    "Número de documento"
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={newCustomer.address || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {isAddingNew ? (
            <>
              <Button variant="outline" onClick={() => setIsAddingNew(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={saveNewCustomer} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cliente"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}