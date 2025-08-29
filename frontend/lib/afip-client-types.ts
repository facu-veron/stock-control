// ✅ TIPOS MEJORADOS PARA CLIENTE AFIP según requerimientos

export type TipoDocumento = 'CUIT' | 'DNI' | 'CUIL';

export type CondicionIVA = 
  | 'ResponsableInscripto'
  | 'Monotributista' 
  | 'ConsumidorFinal'
  | 'Exento'
  | 'NoAlcanzado'
  | 'Proveedor'
  | 'Cliente'
  | 'IVALiberado'
  | 'MonotributistaSocial'
  | 'TrabajadorIndependiente';

export interface Cliente {
  tipoDocumento: TipoDocumento;
  numeroDocumento: string; // Número completo sin guiones
  condicionIVA: CondicionIVA;
  razonSocial: string;
  email: string;
  direccion: string;
}

// ✅ MAPEO DE CONDICIONES IVA A TIPOS DE DOCUMENTO VÁLIDOS
export const DOCUMENTO_POR_CONDICION: Record<CondicionIVA, TipoDocumento[]> = {
  'ResponsableInscripto': ['CUIT'],
  'Monotributista': ['CUIT', 'CUIL'],
  'ConsumidorFinal': ['DNI'],
  'Exento': ['CUIT'],
  'NoAlcanzado': ['DNI', 'CUIT'],
  'Proveedor': ['CUIT'],
  'Cliente': ['CUIT', 'DNI'],
  'IVALiberado': ['CUIT'],
  'MonotributistaSocial': ['CUIL', 'DNI'],
  'TrabajadorIndependiente': ['CUIT', 'CUIL'],
};

// ✅ AUTO-SUGERENCIA: Tipo de documento preferido por condición
export const DOCUMENTO_SUGERIDO: Record<CondicionIVA, TipoDocumento> = {
  'ResponsableInscripto': 'CUIT',
  'Monotributista': 'CUIT',
  'ConsumidorFinal': 'DNI', 
  'Exento': 'CUIT',
  'NoAlcanzado': 'DNI',
  'Proveedor': 'CUIT',
  'Cliente': 'CUIT',
  'IVALiberado': 'CUIT',
  'MonotributistaSocial': 'CUIL',
  'TrabajadorIndependiente': 'CUIT',
};

// ✅ LABELS PARA UI
export const CONDICION_IVA_LABELS: Record<CondicionIVA, string> = {
  'ResponsableInscripto': 'Responsable Inscripto',
  'Monotributista': 'Monotributista',
  'ConsumidorFinal': 'Consumidor Final',
  'Exento': 'Exento',
  'NoAlcanzado': 'No Alcanzado',
  'Proveedor': 'Proveedor del Exterior',
  'Cliente': 'Cliente del Exterior', 
  'IVALiberado': 'IVA Liberado',
  'MonotributistaSocial': 'Monotributista Social',
  'TrabajadorIndependiente': 'Trabajador Independiente',
};

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  'CUIT': 'CUIT',
  'CUIL': 'CUIL',
  'DNI': 'DNI',
};

// ✅ AYUDA CONTEXTUAL
export const AYUDA_POR_CONDICION: Record<CondicionIVA, string> = {
  'ResponsableInscripto': 'Empresas y profesionales inscriptos en IVA. Requiere CUIT de 11 dígitos.',
  'Monotributista': 'Pequeños contribuyentes. Pueden usar CUIT o CUIL de 11 dígitos.',
  'ConsumidorFinal': 'Personas físicas que no realizan actividad comercial. Requiere DNI de 7-8 dígitos.',
  'Exento': 'Entidades exentas del pago de IVA. Requiere CUIT de 11 dígitos.',
  'NoAlcanzado': 'Actividades no alcanzadas por IVA. Puede usar DNI o CUIT.',
  'Proveedor': 'Proveedores del exterior. Requiere CUIT de 11 dígitos.',
  'Cliente': 'Clientes del exterior. Puede usar CUIT o DNI.',
  'IVALiberado': 'Sujetos liberados de IVA. Requiere CUIT de 11 dígitos.',
  'MonotributistaSocial': 'Monotributistas del régimen social. Pueden usar CUIL o DNI.',
  'TrabajadorIndependiente': 'Trabajadores independientes promovidos. Pueden usar CUIT o CUIL.',
};

// ✅ VALIDACIONES
export function validarLongitudDocumento(numero: string, tipo: TipoDocumento): boolean {
  const limpio = numero.replace(/\D/g, '');
  
  switch (tipo) {
    case 'CUIT':
    case 'CUIL':
      return limpio.length === 11;
    case 'DNI':
      return limpio.length >= 7 && limpio.length <= 8;
    default:
      return false;
  }
}

export function validarCompatibilidadDocumento(condicion: CondicionIVA, tipo: TipoDocumento): boolean {
  return DOCUMENTO_POR_CONDICION[condicion].includes(tipo);
}

// ✅ FORMATEO DE DOCUMENTOS
export function formatearDocumento(numero: string, tipo: TipoDocumento): string {
  const limpio = numero.replace(/\D/g, '');
  
  switch (tipo) {
    case 'CUIT':
    case 'CUIL':
      if (limpio.length === 11) {
        return `${limpio.slice(0, 2)}-${limpio.slice(2, 10)}-${limpio.slice(10)}`;
      }
      break;
    case 'DNI':
      if (limpio.length >= 7) {
        return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      break;
  }
  
  return numero;
}

export function limpiarDocumento(numero: string): string {
  return numero.replace(/\D/g, '');
}

// ✅ VALIDADOR DE DÍGITO VERIFICADOR CUIT/CUIL
export function validarDigitoVerificador(cuit: string): boolean {
  const limpio = cuit.replace(/\D/g, '');
  if (limpio.length !== 11) return false;
  
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  
  for (let i = 0; i < 10; i++) {
    suma += parseInt(limpio[i]) * multiplicadores[i];
  }
  
  const resto = suma % 11;
  const digitoCalculado = resto < 2 ? resto : 11 - resto;
  const digitoIngresado = parseInt(limpio[10]);
  
  return digitoCalculado === digitoIngresado;
}

// ✅ OPCIONES PARA DROPDOWNS
export const CONDICION_IVA_OPTIONS = Object.entries(CONDICION_IVA_LABELS).map(
  ([value, label]) => ({ value: value as CondicionIVA, label })
);

export const TIPO_DOCUMENTO_OPTIONS = Object.entries(TIPO_DOCUMENTO_LABELS).map(
  ([value, label]) => ({ value: value as TipoDocumento, label })
);

// ✅ MAPEO A TIPOS LEGACY (para compatibilidad con backend actual)
export function mapearADocumentTypeUI(tipo: TipoDocumento): string {
  const mapeo = {
    'CUIT': 'CUIT',
    'CUIL': 'CUIL', 
    'DNI': 'DNI'
  };
  return mapeo[tipo];
}

export function mapearACondicionLegacy(condicion: CondicionIVA): string {
  const mapeo = {
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
  return mapeo[condicion];
}
