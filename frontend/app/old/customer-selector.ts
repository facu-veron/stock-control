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
import type { Customer } from "@/components/pos/pos-interface"
import { UserRound, Search, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Clientes de ejemplo
const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Juan Pérez",
    documentType: "DNI",
    documentNumber: "28456789",
    email: "juan.perez@example.com",
    address: "Av. Corrientes 1234, CABA",
    taxCondition: "Responsable Inscripto",
    taxId: "20-28456789-4",
  },
  {
    id: "2",
    name: "María González",
    documentType: "DNI",
    documentNumber: "30123456",
    email: "maria.gonzalez@example.com",
    address: "Av. Santa Fe 567, CABA",
    taxCondition: "Consumidor Final",
    taxId: "27-30123456-2",
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    documentType: "DNI",
    documentNumber: "25789456",
    email: "carlos.rodriguez@example.com",
    address: "Calle Lavalle 789, CABA",
    taxCondition: "Monotributista",
    taxId: "20-25789456-8",
  },
  {
    id: "4",
    name: "Laura Fernández",
    documentType: "DNI",
    documentNumber: "32456123",
    email: "laura.fernandez@example.com",
    address: "Av. Cabildo 1234, CABA",
    taxCondition: "Exento",
    taxId: "27-32456123-5",
  },
  {
    id: "5",
    name: "Empresa ABC S.A.",
    documentType: "CUIT",
    documentNumber: "30712345678",
    email: "contacto@empresaabc.com",
    address: "Av. Córdoba 1234, CABA",
    taxCondition: "Responsable Inscripto",
    taxId: "30-71234567-8",
  },
]

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer) => void
  selectedCustomer: Customer | null
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newCustomer, setNewCustomer] = React.useState<Partial<Customer>>({
    documentType: "DNI",
    taxCondition: "Consumidor Final",
  })
  const [isAddingNew, setIsAddingNew] = React.useState(false)

  // Filtrar clientes por búsqueda
  const filteredCustomers = React.useMemo(() => {
    return mockCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.documentNumber.includes(searchTerm) ||
        customer.taxId.includes(searchTerm),
    )
  }, [searchTerm])

  // Seleccionar cliente
  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setOpen(false)
  }

  // Consultar datos fiscales (simulado)
  const fetchTaxData = () => {
    if (!newCustomer.taxId) return

    // Simulación de consulta a AFIP
    setTimeout(() => {
      if (newCustomer.taxId === "30-71234567-8") {
        setNewCustomer({
          ...newCustomer,
          name: "Empresa ABC S.A.",
          taxCondition: "Responsable Inscripto",
          address: "Av. Córdoba 1234, CABA",
        })
      } else if (newCustomer.taxId === "20-25789456-8") {
        setNewCustomer({
          ...newCustomer,
          name: "Carlos Rodríguez",
          taxCondition: "Monotributista",
          address: "Calle Lavalle 789, CABA",
        })
      }
    }, 1000)
  }

  // Guardar nuevo cliente
  const saveNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.taxId) return

    const customer: Customer = {
      id: `NEW-${Date.now()}`,
      name: newCustomer.name,
      documentType: newCustomer.documentType || "DNI",
      documentNumber: newCustomer.documentNumber || "",
      email: newCustomer.email || "",
      address: newCustomer.address || "",
      taxCondition: newCustomer.taxCondition as Customer["taxCondition"],
      taxId: newCustomer.taxId,
    }

    onSelectCustomer(customer)
    setIsAddingNew(false)
    setNewCustomer({
      documentType: "DNI",
      taxCondition: "Consumidor Final",
    })
    setOpen(false)
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
              <Button variant="outline" onClick={() => setIsAddingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-2">
              {filteredCustomers.length > 0 ? (
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
                          {customer.documentType}: {customer.documentNumber} | CUIT/CUIL: {customer.taxId}
                        </div>
                      </div>
                      <Badge>{customer.taxCondition}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">No se encontraron clientes con esa búsqueda</div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">CUIT/CUIL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="taxId"
                    value={newCustomer.taxId || ""}
                    onChange={(e) => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
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
                  value={newCustomer.taxCondition}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      taxCondition: e.target.value as Customer["taxCondition"],
                    })
                  }
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                  <option value="Consumidor Final">Consumidor Final</option>
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
                  onChange={(e) => setNewCustomer({ ...newCustomer, documentType: e.target.value })}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentNumber">Número de Documento</Label>
                <Input
                  id="documentNumber"
                  value={newCustomer.documentNumber || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, documentNumber: e.target.value })}
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
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                Cancelar
              </Button>
              <Button onClick={saveNewCustomer}>Guardar Cliente</Button>
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
