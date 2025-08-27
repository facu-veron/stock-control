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
import { getSuppliers, createSupplier, type Supplier } from "@/lib/api"

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer) => void
  selectedCustomer: Customer | null
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [newCustomer, setNewCustomer] = React.useState<Partial<Supplier>>({})
  const [isAddingNew, setIsAddingNew] = React.useState(false)
  const [customers, setCustomers] = React.useState<Supplier[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    getSuppliers()
      .then((data) => {
        setCustomers(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Error al cargar clientes")
        setLoading(false)
      })
  }, [open])

  // Filtrar clientes por búsqueda
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.includes(searchTerm)) ||
        (customer.id && customer.id.includes(searchTerm))
    )
  }, [searchTerm, customers])

  // Seleccionar cliente
  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setOpen(false)
  }

  // Guardar nuevo cliente
  const saveNewCustomer = async () => {
    if (!newCustomer.name) return
    setLoading(true)
    try {
      const created = await createSupplier({
        name: newCustomer.name,
        contact: newCustomer.contact,
        email: newCustomer.email,
        phone: newCustomer.phone,
      })
      setCustomers((prev) => [...prev, created])
      onSelectCustomer(created)
      setIsAddingNew(false)
      setNewCustomer({})
      setOpen(false)
    } catch (e) {
      setError("Error al crear cliente")
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
              <Button variant="outline" onClick={() => setIsAddingNew(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-2">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Cargando clientes...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
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
                          {customer.email ? `Email: ${customer.email}` : ""}
                        </div>
                      </div>
                      <Badge>{customer.contact}</Badge>
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
                <Label htmlFor="name">Nombre o Razón Social</Label>
                <Input
                  id="name"
                  value={newCustomer.name || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contacto</Label>
                <Input
                  id="contact"
                  value={newCustomer.contact || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newCustomer.phone || ""}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {isAddingNew ? (
            <>
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
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
