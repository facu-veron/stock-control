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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, AlertCircle, Info, Search, User, HelpCircle } from "lucide-react"
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
  // Estado del formulario
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
  const [sinDocumento, setSinDocumento] = React.useState(false); // NUEVO: para manejar CF

  // NUEVO: Opciones mejoradas para tipos de documento según condición IVA
  const getOpcionesDocumentoMejoradas = (condicion: CondicionIVA): Array<{value: TipoDocumento, label: string, description: string}> => {
    switch (condicion) {
      case 'ConsumidorFinal':
        return [
          { value: 'DNI', label: 'DNI', description: 'Para personas físicas con documento' },
          { value: 'CF', label: 'Consumidor Final', description: 'Sin datos de documento (venta mostrador)' }
        ];
      case 'ResponsableInscripto':
        return [
          { value: 'CUIT', label: 'CUIT', description: 'Obligatorio para Responsables Inscriptos' }
        ];
      case 'Monotributo':
        return [
          { value: 'CUIT', label: 'CUIT', description: 'Recomendado para Monotributistas' },
          { value: 'CUIL', label: 'CUIL', description: 'Alternativa válida' },
          { value: 'DNI', label: 'DNI', description: 'Solo en casos especiales' }
        ];
      case 'Exento':
        return [
          { value: 'CUIT', label: 'CUIT', description: 'Para entidades exentas' },
          { value: 'DNI', label: 'DNI', description: 'Para personas físicas exentas' }
        ];
      default:
        return TIPO_DOCUMENTO_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label,
          description: 'Documento válido para esta condición'
        }));
    }
  };

  // NUEVO: Validación mejorada
  const validarDocumento = React.useCallback((numero: string, tipo: TipoDocumento, esSinDocumento: boolean) => {
    const erroresTemp: Record<string, string> = {};
    
    // Si es CF (sin documento), no validar número
    if (tipo === 'CF' || esSinDocumento) {
      return erroresTemp;
    }
    
    if (!numero) {
      erroresTemp.documento = 'El número de documento es requerido';
      return erroresTemp;
    }

    if (!validarLongitudDocumento(numero, tipo)) {
      const longitud = tipo === 'DNI' ? '7-8 dígitos' : '11 dígitos';
      erroresTemp.documento = `${tipo} debe tener ${longitud}`;
      return erroresTemp;
    }

    if ((tipo === 'CUIT' || tipo === 'CUIL') && !validarDigitoVerificador(numero)) {
      erroresTemp.documento = `${tipo} inválido - dígito verificador incorrecto`;
      return erroresTemp;
    }

    return erroresTemp;
  }, []);

  // Efectos
  React.useEffect(() => {
    if (cliente.numeroDocumento && cliente.tipoDocumento && !sinDocumento) {
      const formateado = formatearDocumento(cliente.numeroDocumento, cliente.tipoDocumento);
      setDocumentoFormateado(formateado);
    } else {
      setDocumentoFormateado('');
    }
  }, [cliente.numeroDocumento, cliente.tipoDocumento, sinDocumento]);

  React.useEffect(() => {
    const nuevosErrores: Record<string, string> = {};

    // Validar documento
    if (cliente.tipoDocumento) {
      const erroresDoc = validarDocumento(cliente.numeroDocumento || '', cliente.tipoDocumento, sinDocumento);
      Object.assign(nuevosErrores, erroresDoc);
    }

    // Validar compatibilidad
    if (cliente.condicionIVA && cliente.tipoDocumento) {
      if (!validarCompatibilidadDocumento(cliente.condicionIVA, cliente.tipoDocumento)) {
        nuevosErrores.compatibilidad = `${cliente.condicionIVA} no es compatible con ${cliente.tipoDocumento}`;
      }
    }

    setErrores(nuevosErrores);
  }, [cliente.numeroDocumento, cliente.tipoDocumento, cliente.condicionIVA, sinDocumento, validarDocumento]);

  // MEJORADO: Manejar cambio de condición IVA
  const handleCondicionChange = (nuevaCondicion: CondicionIVA) => {
    const opcionesDisponibles = getOpcionesDocumentoMejoradas(nuevaCondicion);
    const tipoSugerido = opcionesDisponibles[0].value; // Primer opción como sugerida
    
    setCliente(prev => ({
      ...prev,
      condicionIVA: nuevaCondicion,
      tipoDocumento: tipoSugerido,
      numeroDocumento: ''
    }));
    
    setSinDocumento(tipoSugerido === 'CF');

    // Toast más específico
    const mensaje = nuevaCondicion === 'ConsumidorFinal' 
      ? 'Para Consumidor Final puedes usar DNI o venta sin documento (CF)'
      : nuevaCondicion === 'ResponsableInscripto'
      ? 'Responsables Inscriptos deben usar CUIT obligatoriamente'
      : `Se sugiere usar ${tipoSugerido} para ${nuevaCondicion}`;

    toast({
      title: "Tipo de documento actualizado",
      description: mensaje,
    });
  };

  // MEJORADO: Manejar cambio de tipo documento
  const handleTipoDocumentoChange = (nuevoTipo: TipoDocumento) => {
    setCliente(prev => ({
      ...prev,
      tipoDocumento: nuevoTipo,
      numeroDocumento: nuevoTipo === 'CF' ? '0' : '' // CF usa número 0
    }));
    
    setSinDocumento(nuevoTipo === 'CF');
    
    if (nuevoTipo === 'CF') {
      toast({
        title: "Venta sin documento",
        description: "El cliente aparecerá como 'Consumidor Final' en la factura",
      });
    }
  };

  // Manejar cambio de número documento
  const handleDocumentoChange = (valor: string) => {
    const limpio = limpiarDocumento(valor);
    setCliente(prev => ({
      ...prev,
      numeroDocumento: limpio
    }));
  };

  // NUEVO: Toggle para venta sin documento
  const handleSinDocumentoChange = (checked: boolean) => {
    setSinDocumento(checked);
    
    if (checked) {
      setCliente(prev => ({
        ...prev,
        tipoDocumento: 'CF',
        numeroDocumento: '0'
      }));
    } else {
      setCliente(prev => ({
        ...prev,
        tipoDocumento: 'DNI',
        numeroDocumento: ''
      }));
    }
  };

  // Buscar en AFIP
  const buscarEnAFIP = async () => {
    if (!cliente.numeroDocumento || !cliente.tipoDocumento || sinDocumento) {
      toast({
        title: "Error",
        description: "Ingrese un número de documento válido para buscar",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Función no implementada",
      description: "La búsqueda en AFIP estará disponible próximamente",
    });
  };

  // Validación final
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

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;

    setCargando(true);

    try {
      const documentTypeMapped = mapearADocumentTypeUI(cliente.tipoDocumento!) as DocumentTypeUI;
      const taxStatusMapped = mapearACondicionLegacy(cliente.condicionIVA!) as TaxConditionUI;
      
      const clienteLegacy = {
        name: cliente.razonSocial!,
        documentType: documentTypeMapped,
        documentNumber: sinDocumento ? '0' : cliente.numeroDocumento!,
        taxStatus: taxStatusMapped,
        email: cliente.email || '',
        address: cliente.direccion || '',
      };

      const clienteCreado = await createCustomer(clienteLegacy);
      
      toast({
        title: "Cliente creado exitosamente",
        description: `${cliente.razonSocial} ha sido agregado al sistema`,
      });

      onClienteCreado({
        tipoDocumento: cliente.tipoDocumento!,
        numeroDocumento: sinDocumento ? '0' : cliente.numeroDocumento!,
        condicionIVA: cliente.condicionIVA!,
        razonSocial: cliente.razonSocial!,
        email: cliente.email || '',
        direccion: cliente.direccion || ''
      });

    } catch (error) {
      console.error("Error al crear cliente:", error);
      
      let errorMessage = "Error desconocido";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes("Failed to create customer")) {
          errorMessage = `Cliente con ${cliente.tipoDocumento} ${cliente.numeroDocumento} ya existe.`;
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

  // Estado visual del documento
  const estadoDocumento = React.useMemo(() => {
    if (sinDocumento || cliente.tipoDocumento === 'CF') return 'neutro';
    if (!cliente.numeroDocumento) return 'neutro';
    if (errores.documento || errores.compatibilidad) return 'error';
    return 'exito';
  }, [cliente.numeroDocumento, errores, sinDocumento, cliente.tipoDocumento]);

  const opcionesDocumento = getOpcionesDocumentoMejoradas(cliente.condicionIVA || 'ConsumidorFinal');

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
          
          {/* Condición IVA */}
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
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {AYUDA_POR_CONDICION[option.value]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* NUEVO: Información contextual mejorada */}
            {cliente.condicionIVA && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{cliente.condicionIVA}:</strong> {AYUDA_POR_CONDICION[cliente.condicionIVA]}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* NUEVO: Opción para venta sin documento (solo para Consumidor Final) */}
          {cliente.condicionIVA === 'ConsumidorFinal' && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sinDocumento" 
                  checked={sinDocumento}
                  onCheckedChange={handleSinDocumentoChange}
                />
                <Label htmlFor="sinDocumento" className="text-sm font-medium">
                  Venta sin documento (mostrador)
                </Label>
                <HelpCircle className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xs text-blue-600">
                Para ventas rápidas sin recopilar datos del cliente. Aparecerá como "Consumidor Final" en la factura.
              </p>
            </div>
          )}

          {/* Tipo de Documento Mejorado */}
          <div className="space-y-2">
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <Select 
              value={cliente.tipoDocumento} 
              onValueChange={handleTipoDocumentoChange}
              disabled={sinDocumento}
            >
              <SelectTrigger className={sinDocumento ? "opacity-50" : ""}>
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                {opcionesDocumento.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Badges informativos */}
            <div className="flex gap-2">
              {cliente.condicionIVA && cliente.tipoDocumento === DOCUMENTO_SUGERIDO[cliente.condicionIVA] && (
                <Badge variant="secondary">Recomendado</Badge>
              )}
              {cliente.tipoDocumento === 'CF' && (
                <Badge variant="outline">Sin documento</Badge>
              )}
            </div>
            
            {errores.compatibilidad && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errores.compatibilidad}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Número de Documento */}
          {!sinDocumento && cliente.tipoDocumento !== 'CF' && (
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
          )}

          {/* Razón Social */}
          <div className="space-y-2">
            <Label htmlFor="razonSocial">
              {cliente.condicionIVA === 'ResponsableInscripto' ? 'Razón Social *' : 'Nombre / Razón Social *'}
            </Label>
            <Input
              id="razonSocial"
              value={cliente.razonSocial}
              onChange={(e) => setCliente(prev => ({ ...prev, razonSocial: e.target.value }))}
              placeholder={
                cliente.condicionIVA === 'ResponsableInscripto' 
                  ? "Razón social de la empresa"
                  : sinDocumento
                  ? "Cliente de mostrador"
                  : "Nombre completo o razón social"
              }
            />
          </div>

          {/* Email - Solo si no es venta sin documento */}
          {!sinDocumento && (
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
          )}

          {/* Dirección - Solo si no es venta sin documento */}
          {!sinDocumento && (
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
          )}

          {/* Acciones */}
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