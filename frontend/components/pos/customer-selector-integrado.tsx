"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserRound, Plus } from "lucide-react"
import { AgregarClienteMejorado } from "./agregar-cliente-mejorado"
import { type Cliente } from "@/lib/afip-client-types"
import { type Customer } from "@/lib/api" // Tipo actual del sistema
import { type TaxConditionUI } from "@/lib/afip-types"

interface CustomerSelectorIntegradoProps {
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export function CustomerSelectorIntegrado({ 
  onSelectCustomer, 
  selectedCustomer,
  open,
  setOpen 
}: CustomerSelectorIntegradoProps) {
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(open || false);

  // ✅ Manejar cliente creado con nuevo formulario
  const handleClienteCreado = (cliente: Cliente) => {
    // Mapear de Cliente mejorado a Customer legacy
    const customerLegacy: Customer = {
      id: '', // Se asignará desde el backend
      name: cliente.razonSocial,
      documentType: cliente.tipoDocumento as any, // Compatibilidad
      documentNumber: cliente.numeroDocumento,
      taxStatus: mapearCondicionALegacy(cliente.condicionIVA),
      email: cliente.email,
      address: cliente.direccion,
      taxId: cliente.numeroDocumento, // Para compatibilidad
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSelectCustomer(customerLegacy);
    setShowNewForm(false);
    setDialogOpen(false);
    if (setOpen) setOpen(false);
  };

  // ✅ Mapeo de condición IVA a formato legacy
  function mapearCondicionALegacy(condicion: string): TaxConditionUI {
    const mapeo: Record<string, TaxConditionUI> = {
      'ResponsableInscripto': 'RESPONSABLE_INSCRIPTO',
      'Monotributista': 'MONOTRIBUTO', 
      'ConsumidorFinal': 'CONSUMIDOR_FINAL',
      'Exento': 'EXENTO',
      'NoAlcanzado': 'NO_ALCANZADO',
      'Proveedor': 'PROVEEDOR_EXTERIOR',
      'Cliente': 'CLIENTE_EXTERIOR',
      'IVALiberado': 'LIBERADO_LEY_19640',
      'MonotributistaSocial': 'MONOTRIBUTO_SOCIAL',
      'TrabajadorIndependiente': 'TRABAJADOR_INDEPENDIENTE_PROMOVIDO',
    };
    return mapeo[condicion] || 'CONSUMIDOR_FINAL' as TaxConditionUI;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (setOpen) setOpen(open);
      if (!open) setShowNewForm(false);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          {selectedCustomer ? selectedCustomer.name : "Seleccionar Cliente"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showNewForm ? "Agregar Nuevo Cliente" : "Seleccionar Cliente"}
          </DialogTitle>
        </DialogHeader>

        {showNewForm ? (
          <AgregarClienteMejorado
            onClienteCreado={handleClienteCreado}
            onCancelar={() => setShowNewForm(false)}
          />
        ) : (
          <div className="space-y-4">
            {/* ✅ Aquí puedes mantener tu lista de clientes existentes */}
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Lista de clientes existentes (mantener implementación actual)
              </p>
              <Button 
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crear Nuevo Cliente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
