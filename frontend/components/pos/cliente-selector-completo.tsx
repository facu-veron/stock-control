"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, User, FileText, UserRound } from "lucide-react"
import { AgregarClienteMejorado } from "./agregar-cliente-mejorado"
import { getCustomers, type Customer } from "@/lib/api"
import { type Cliente } from "@/lib/afip-client-types"
import { type TaxConditionUI } from "@/lib/afip-types"

interface ClienteSelectorCompletoProps {
  onClienteSeleccionado: (cliente: Customer) => void;
  clienteSeleccionado: Customer | null;
}

export function ClienteSelectorCompleto({ onClienteSeleccionado, clienteSeleccionado }: ClienteSelectorCompletoProps) {
  const [open, setOpen] = React.useState(false);
  const [modo, setModo] = React.useState<"seleccionar" | "crear">("seleccionar");
  const [clientes, setClientes] = React.useState<Customer[]>([]);
  const [busqueda, setBusqueda] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ✅ Cargar clientes al montar y cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      cargarClientes();
      setModo("seleccionar"); // Reset modo al abrir
      setBusqueda(""); // Reset búsqueda
    }
  }, [open]);

  const cargarClientes = async () => {
    setCargando(true);
    setError(null);
    try {
      const clientesCargados = await getCustomers();
      setClientes(clientesCargados);
    } catch (err) {
      setError("Error al cargar clientes");
      console.error("Error cargando clientes:", err);
    } finally {
      setCargando(false);
    }
  };

  // ✅ Filtrar clientes por búsqueda
  const clientesFiltrados = React.useMemo(() => {
    if (!busqueda) return clientes;
    
    const termino = busqueda.toLowerCase();
    return clientes.filter(cliente => 
      cliente.name.toLowerCase().includes(termino) ||
      cliente.documentNumber?.toLowerCase().includes(termino) ||
      cliente.email?.toLowerCase().includes(termino)
    );
  }, [clientes, busqueda]);

  // ✅ Manejar selección de cliente
  const handleSeleccionarCliente = (cliente: Customer) => {
    onClienteSeleccionado(cliente);
    setOpen(false); // Cerrar modal
  };

  // ✅ Manejar cliente creado
  const handleClienteCreado = (clienteNuevo: Cliente) => {
    // Mapear a formato Customer legacy
    const customerLegacy: Customer = {
      id: '', // Se asignará desde el backend
      name: clienteNuevo.razonSocial,
      documentType: clienteNuevo.tipoDocumento as any,
      documentNumber: clienteNuevo.numeroDocumento,
      taxStatus: mapearCondicionALegacy(clienteNuevo.condicionIVA),
      email: clienteNuevo.email,
      address: clienteNuevo.direccion,
      taxId: clienteNuevo.numeroDocumento,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onClienteSeleccionado(customerLegacy);
    setOpen(false); // Cerrar modal
    setModo("seleccionar");
    cargarClientes(); // Recargar lista para mostrar el nuevo cliente
  };

  // ✅ Mapeo de condición IVA
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

  const contenidoModal = modo === "crear" ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Crear Nuevo Cliente
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setModo("seleccionar")}
        >
          ← Volver a Lista
        </Button>
      </div>
      <AgregarClienteMejorado
        onClienteCreado={handleClienteCreado}
        onCancelar={() => setModo("seleccionar")}
      />
    </div>
  ) : (
    <div className="space-y-4">
        
        {/* ✅ Buscador y botón crear */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button 
            onClick={() => setModo("crear")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>

        {/* ✅ Cliente seleccionado */}
        {clienteSeleccionado && (
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{clienteSeleccionado.name}</div>
                <div className="text-sm text-muted-foreground">
                  {clienteSeleccionado.documentType}: {clienteSeleccionado.documentNumber}
                </div>
              </div>
              <Badge variant="secondary">Seleccionado</Badge>
            </div>
          </div>
        )}

        {/* ✅ Lista de clientes */}
        <div className="space-y-2">
          <Label>Clientes Disponibles</Label>
          <ScrollArea className="h-[300px] border rounded-md">
            {cargando ? (
              <div className="p-4 text-center text-muted-foreground">
                Cargando clientes...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                {error}
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {busqueda ? "No se encontraron clientes" : "No hay clientes"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      clienteSeleccionado?.id === cliente.id ? 'bg-primary/10 border-primary' : 'border-border'
                    }`}
                    onClick={() => handleSeleccionarCliente(cliente)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{cliente.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {cliente.documentType}: {cliente.documentNumber}
                        </div>
                        {cliente.email && (
                          <div className="text-xs text-muted-foreground">{cliente.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {cliente.taxStatus?.replace('_', ' ')}
                        </Badge>
                        {clienteSeleccionado?.id === cliente.id && (
                          <Badge variant="default">✓</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          {clienteSeleccionado ? clienteSeleccionado.name : "Seleccionar Cliente"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modo === "crear" ? "Crear Nuevo Cliente" : "Seleccionar Cliente"}
          </DialogTitle>
        </DialogHeader>
        {contenidoModal}
      </DialogContent>
    </Dialog>
  );
}
