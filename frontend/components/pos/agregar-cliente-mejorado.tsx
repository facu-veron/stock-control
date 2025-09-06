"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, AlertCircle, Info, Search, User } from "lucide-react"
import { 
  type Cliente,
  type TipoDocumento,
  type CondicionIVA,
  CONDICION_IVA_OPTIONS,
  TIPO_DOCUMENTO_OPTIONS,
  DOCUMENTO_POR_CONDICION,
  DOCUMENTO_SUGERIDO,
  AYUDA_POR_CONDICION,
  validarLongitudDocumento,
  validarCompatibilidadDocumento,
  formatearDocumento,
  limpiarDocumento,
  validarDigitoVerificador,
  mapearADocumentTypeUI,
  mapearACondicionLegacy
} from "@/lib/afip-client-types"
import { createCustomer } from "@/lib/api"
import type { DocumentTypeUI, TaxConditionUI } from "@/lib/afip-types"

interface AgregarClienteMejoradoProps {
  onClienteCreado: (cliente: Cliente) => void;
  onCancelar: () => void;
}

export function AgregarClienteMejorado({ onClienteCreado, onCancelar }: AgregarClienteMejoradoProps) {
  // ✅ Estado del formulario
  const [cliente, setCliente] = React.useState<Partial<Cliente>>({
    tipoDocumento: 'DNI',
    condicionIVA: 'ConsumidorFinal',
    numeroDocumento: '',
    razonSocial: '',
    email: '',
    direccion: ''
  });

  const [errores, setErrores] = React.useState<Record<string, string>>({});
  const [cargando, setCargando] = React.useState(false);
  const [documentoFormateado, setDocumentoFormateado] = React.useState('');

  // ✅ Validación en tiempo real del documento
  const validarDocumento = React.useCallback((numero: string, tipo: TipoDocumento) => {
    const erroresTemp: Record<string, string> = {};
    
    if (!numero) {
      erroresTemp.documento = 'El número de documento es requerido';
      return erroresTemp;
    }

    // Validar longitud
    if (!validarLongitudDocumento(numero, tipo)) {
      const longitud = tipo === 'DNI' ? '7-8 dígitos' : '11 dígitos';
      erroresTemp.documento = `${tipo} debe tener ${longitud}`;
      return erroresTemp;
    }

    // Validar dígito verificador para CUIT/CUIL
    if ((tipo === 'CUIT' || tipo === 'CUIL') && !validarDigitoVerificador(numero)) {
      erroresTemp.documento = `${tipo} inválido - dígito verificador incorrecto`;
      return erroresTemp;
    }

    return erroresTemp;
  }, []);

  // ✅ Validación de compatibilidad condición IVA vs tipo documento
  const validarCompatibilidad = React.useCallback((condicion: CondicionIVA, tipo: TipoDocumento) => {
    if (!validarCompatibilidadDocumento(condicion, tipo)) {
      return `${condicion} no es compatible con ${tipo}. Tipos válidos: ${DOCUMENTO_POR_CONDICION[condicion].join(', ')}`;
    }
    return null;
  }, []);

  // ✅ Efecto para auto-formatear documento
  React.useEffect(() => {
    if (cliente.numeroDocumento && cliente.tipoDocumento) {
      const formateado = formatearDocumento(cliente.numeroDocumento, cliente.tipoDocumento);
      setDocumentoFormateado(formateado);
    } else {
      setDocumentoFormateado('');
    }
  }, [cliente.numeroDocumento, cliente.tipoDocumento]);

  // ✅ Efecto para validación automática
  React.useEffect(() => {
    const nuevosErrores: Record<string, string> = {};

    // Validar documento
    if (cliente.numeroDocumento && cliente.tipoDocumento) {
      const erroresDoc = validarDocumento(cliente.numeroDocumento, cliente.tipoDocumento);
      Object.assign(nuevosErrores, erroresDoc);
    }

    // Validar compatibilidad
    if (cliente.condicionIVA && cliente.tipoDocumento) {
      const errorCompatibilidad = validarCompatibilidad(cliente.condicionIVA, cliente.tipoDocumento);
      if (errorCompatibilidad) {
        nuevosErrores.compatibilidad = errorCompatibilidad;
      }
    }

    setErrores(nuevosErrores);
  }, [cliente.numeroDocumento, cliente.tipoDocumento, cliente.condicionIVA, validarDocumento, validarCompatibilidad]);

  // ✅ Manejar cambio de condición IVA (auto-sugerir tipo documento)
  const handleCondicionChange = (nuevaCondicion: CondicionIVA) => {
    const tipoSugerido = DOCUMENTO_SUGERIDO[nuevaCondicion];
    
    setCliente(prev => ({
      ...prev,
      condicionIVA: nuevaCondicion,
      tipoDocumento: tipoSugerido,
      numeroDocumento: '' // Limpiar documento al cambiar condición
    }));

    toast({
      title: "Tipo de documento sugerido",
      description: `Para ${nuevaCondicion} se sugiere usar ${tipoSugerido}`,
    });
  };

  // ✅ Manejar cambio de tipo documento
  const handleTipoDocumentoChange = (nuevoTipo: TipoDocumento) => {
    setCliente(prev => ({
      ...prev,
      tipoDocumento: nuevoTipo,
      numeroDocumento: '' // Limpiar al cambiar tipo
    }));
  };

  // ✅ Manejar cambio de número documento
  const handleDocumentoChange = (valor: string) => {
    const limpio = limpiarDocumento(valor);
    setCliente(prev => ({
      ...prev,
      numeroDocumento: limpio
    }));
  };

  // ✅ Función para autocompletar desde AFIP (simulada)
  const buscarEnAFIP = async () => {
    if (!cliente.numeroDocumento || !cliente.tipoDocumento) {
      toast({
        title: "Error",
        description: "Ingrese un número de documento válido para buscar",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implementar llamada real a AFIP
    toast({
      title: "Función no implementada",
      description: "La búsqueda en AFIP estará disponible próximamente",
    });
  };

  // ✅ Validación final antes de enviar
  const validarFormulario = (): boolean => {
    if (!cliente.razonSocial?.trim()) {
      toast({
        title: "Error de validación",
        description: "La razón social es requerida",
        variant: "destructive"
      });
      return false;
    }

    if (Object.keys(errores).length > 0) {
      toast({
        title: "Error de validación",
        description: "Corrija los errores antes de continuar",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // ✅ Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    setCargando(true);

    try {
      // Mapear a formato legacy para compatibilidad con backend
      const documentTypeMapped = mapearADocumentTypeUI(cliente.tipoDocumento!) as DocumentTypeUI;
      const taxStatusMapped = mapearACondicionLegacy(cliente.condicionIVA!) as TaxConditionUI;
      
      console.log("🔍 Mapeo de tipos:", {
        tipoDocumento: cliente.tipoDocumento,
        documentTypeMapped,
        condicionIVA: cliente.condicionIVA,
        taxStatusMapped
      });
      
      const clienteLegacy = {
        name: cliente.razonSocial!,
        documentType: documentTypeMapped,
        documentNumber: cliente.numeroDocumento!,
        taxStatus: taxStatusMapped,
        email: cliente.email || '',
        address: cliente.direccion || '',
      };

      console.log("🔍 Enviando cliente al API:", clienteLegacy);

      // ✅ ¡AQUÍ ESTABA EL PROBLEMA! Faltaba la llamada al API
      const clienteCreado = await createCustomer(clienteLegacy);
      console.log("✅ Cliente creado en BD:", clienteCreado);
      
      toast({
        title: "Cliente creado exitosamente",
        description: `${cliente.razonSocial} ha sido agregado al sistema`,
      });

      onClienteCreado({
        tipoDocumento: cliente.tipoDocumento!,
        numeroDocumento: cliente.numeroDocumento!,
        condicionIVA: cliente.condicionIVA!,
        razonSocial: cliente.razonSocial!,
        email: cliente.email || '',
        direccion: cliente.direccion || ''
      });

    } catch (error) {
      console.error("🚨 Error completo al crear cliente:", error);
      console.error("🚨 Error stack:", error instanceof Error ? error.stack : "No stack");
      
      let errorMessage = "Error desconocido";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Detectar si el cliente ya existe
        if (error.message.includes("Failed to create customer")) {
          errorMessage = `Cliente con ${cliente.tipoDocumento} ${cliente.numeroDocumento} ya existe. Usa un documento diferente.`;
        }
      }
      
      toast({
        title: "Error al crear cliente",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCargando(false);
    }
  };

  // ✅ Determinar estado visual del campo documento
  const estadoDocumento = React.useMemo(() => {
    if (!cliente.numeroDocumento) return 'neutro';
    if (errores.documento || errores.compatibilidad) return 'error';
    return 'exito';
  }, [cliente.numeroDocumento, errores]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Agregar Cliente
        </CardTitle>
        <CardDescription>
          Complete los datos del cliente para la facturación electrónica AFIP
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ✅ Condición IVA */}
          <div className="space-y-2">
            <Label htmlFor="condicionIVA">Condición frente al IVA *</Label>
            <Select 
              value={cliente.condicionIVA} 
              onValueChange={handleCondicionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione la condición IVA" />
              </SelectTrigger>
              <SelectContent>
                {CONDICION_IVA_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente.condicionIVA && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {AYUDA_POR_CONDICION[cliente.condicionIVA]}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* ✅ Tipo de Documento (auto-sugerido) */}
          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <div className="flex gap-2 items-center">
              <Select 
                value={cliente.tipoDocumento} 
                onValueChange={handleTipoDocumentoChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_DOCUMENTO_OPTIONS
                    .filter(opt => !cliente.condicionIVA || DOCUMENTO_POR_CONDICION[cliente.condicionIVA].includes(opt.value))
                    .map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {cliente.condicionIVA && cliente.tipoDocumento === DOCUMENTO_SUGERIDO[cliente.condicionIVA] && (
                <Badge variant="secondary">Sugerido</Badge>
              )}
            </div>
            {errores.compatibilidad && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errores.compatibilidad}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* ✅ Número de Documento */}
          <div className="space-y-2">
            <Label htmlFor="numeroDocumento">Número de Documento *</Label>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  id="numeroDocumento"
                  value={documentoFormateado}
                  onChange={(e) => handleDocumentoChange(e.target.value)}
                  placeholder={
                    cliente.tipoDocumento === 'DNI' ? "12.345.678" :
                    cliente.tipoDocumento === 'CUIT' ? "30-12345678-9" :
                    cliente.tipoDocumento === 'CUIL' ? "20-12345678-9" :
                    "Número de documento"
                  }
                  className={
                    estadoDocumento === 'error' ? 'border-red-500' :
                    estadoDocumento === 'exito' ? 'border-green-500' : ''
                  }
                />
                {estadoDocumento === 'exito' && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-3 w-3" />
                    Documento válido
                  </div>
                )}
                {errores.documento && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="h-3 w-3" />
                    {errores.documento}
                  </div>
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={buscarEnAFIP}
                disabled={estadoDocumento !== 'exito'}
                title="Buscar datos en AFIP"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ✅ Razón Social */}
          <div className="space-y-2">
            <Label htmlFor="razonSocial">Razón Social / Nombre *</Label>
            <Input
              id="razonSocial"
              value={cliente.razonSocial}
              onChange={(e) => setCliente(prev => ({ ...prev, razonSocial: e.target.value }))}
              placeholder="Nombre completo o razón social"
            />
          </div>

          {/* ✅ Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={cliente.email}
              onChange={(e) => setCliente(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@ejemplo.com"
            />
          </div>

          {/* ✅ Dirección */}
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea
              id="direccion"
              value={cliente.direccion}
              onChange={(e) => setCliente(prev => ({ ...prev, direccion: e.target.value }))}
              placeholder="Dirección completa"
              rows={3}
            />
          </div>

          {/* ✅ Acciones */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={cargando || Object.keys(errores).length > 0}
              className="flex-1"
            >
              {cargando ? 'Creando...' : 'Crear Cliente'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
