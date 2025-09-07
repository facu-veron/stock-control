// lib/afip-types.ts
// Tipos estandarizados para facturación electrónica AFIP (Frontend)

// ✅ TIPOS UI (strings legibles para el usuario)
export type DocumentTypeUI = 'CUIT' | 'CUIL' | 'DNI' | 'CF' | 'PASSPORT';
export type InvoiceTypeUI = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'TICKET';
export type TaxConditionUI = 
  | 'RESPONSABLE_INSCRIPTO'
  | 'EXENTO' 
  | 'CONSUMIDOR_FINAL'
  | 'MONOTRIBUTO'
  | 'NO_CATEGORIZADO'
  | 'PROVEEDOR_EXTERIOR'
  | 'CLIENTE_EXTERIOR'
  | 'LIBERADO_LEY_19640'
  | 'MONOTRIBUTO_SOCIAL'
  | 'NO_ALCANZADO'
  | 'TRABAJADOR_INDEPENDIENTE_PROMOVIDO';

// ✅ MAPEOS DE UI PARA DISPLAY (strings amigables)
export const TAX_CONDITION_LABELS: Record<TaxConditionUI, string> = {
  RESPONSABLE_INSCRIPTO: 'Responsable Inscripto',
  EXENTO: 'Exento',
  CONSUMIDOR_FINAL: 'Consumidor Final',
  MONOTRIBUTO: 'Monotributista',
  NO_CATEGORIZADO: 'No Categorizado',
  PROVEEDOR_EXTERIOR: 'Proveedor del Exterior',
  CLIENTE_EXTERIOR: 'Cliente del Exterior',
  LIBERADO_LEY_19640: 'IVA Liberado - Ley 19.640',
  MONOTRIBUTO_SOCIAL: 'Monotributista Social',
  NO_ALCANZADO: 'IVA No Alcanzado',
  TRABAJADOR_INDEPENDIENTE_PROMOVIDO: 'Trabajador Independiente Promovido',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeUI, string> = {
  CUIT: 'CUIT',
  CUIL: 'CUIL', 
  DNI: 'DNI',
  CF: 'Consumidor Final',
  PASSPORT: 'Pasaporte',
};

// ✅ OPCIONES SIMPLIFICADAS PARA POS (solo las necesarias)
export const POS_DOCUMENT_TYPE_OPTIONS = [
  { value: 'CUIT' as DocumentTypeUI, label: 'CUIT (Empresas/RI)' },
  { value: 'DNI' as DocumentTypeUI, label: 'DNI (Consumidor Final)' },
  { value: 'CF' as DocumentTypeUI, label: 'Consumidor Final (sin documento)' },
];

export const INVOICE_TYPE_LABELS: Record<InvoiceTypeUI, string> = {
  FACTURA_A: 'Factura A',
  FACTURA_B: 'Factura B',
  FACTURA_C: 'Factura C',
  TICKET: 'Ticket',
};

// ✅ OPCIONES PARA DROPDOWNS/SELECTS
export const TAX_CONDITION_OPTIONS = Object.entries(TAX_CONDITION_LABELS).map(
  ([value, label]) => ({ value: value as TaxConditionUI, label })
);

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as DocumentTypeUI, label })
);

export const INVOICE_TYPE_OPTIONS = Object.entries(INVOICE_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as InvoiceTypeUI, label })
);

// ✅ CONVERSIONES LEGACY (para compatibilidad con código existente)
export function convertLegacyTaxStatus(legacyStatus: string): TaxConditionUI {
  const mapping: Record<string, TaxConditionUI> = {
    'Responsable Inscripto': 'RESPONSABLE_INSCRIPTO',
    'Monotributista': 'MONOTRIBUTO',
    'Monotributo': 'MONOTRIBUTO',
    'MONOTRIBUTO': 'MONOTRIBUTO', // ✅ Agregar key exacta
    'RESPONSABLE_INSCRIPTO': 'RESPONSABLE_INSCRIPTO', // ✅ Agregar key exacta
    'EXENTO': 'EXENTO', // ✅ Agregar key exacta
    'CONSUMIDOR_FINAL': 'CONSUMIDOR_FINAL', // ✅ Agregar key exacta
    'Exento': 'EXENTO',
    'Consumidor Final': 'CONSUMIDOR_FINAL',
    'No Categorizado': 'NO_CATEGORIZADO',
    'NO_CATEGORIZADO': 'NO_CATEGORIZADO', // ✅ Agregar key exacta
    'Proveedor del Exterior': 'PROVEEDOR_EXTERIOR',
    'Cliente del Exterior': 'CLIENTE_EXTERIOR',
    'IVA Liberado - Ley 19.640': 'LIBERADO_LEY_19640',
    'Monotributista Social': 'MONOTRIBUTO_SOCIAL',
    'IVA No Alcanzado': 'NO_ALCANZADO',
    'Trabajador Independiente Promovido': 'TRABAJADOR_INDEPENDIENTE_PROMOVIDO',
  };
  
  return mapping[legacyStatus] || 'CONSUMIDOR_FINAL';
}

export function convertLegacyInvoiceType(legacyType: string): InvoiceTypeUI {
  const mapping: Record<string, InvoiceTypeUI> = {
    'A': 'FACTURA_A',
    'B': 'FACTURA_B', 
    'C': 'FACTURA_C',
    'TICKET': 'TICKET',
    'Factura A': 'FACTURA_A',
    'Factura B': 'FACTURA_B',
    'Factura C': 'FACTURA_C',
  };
  
  return mapping[legacyType] || 'TICKET';
}

// ✅ INFORMACIÓN DEL EMISOR (tu empresa)
export interface CompanyInfo {
  taxCondition: TaxConditionUI;
  cuit: string;
  canIssue: InvoiceTypeUI[];
}

// ✅ CONFIGURACIÓN DEL EMISOR
// En un sistema real, esto se obtendría de la configuración del tenant
export function getCompanyTaxInfo(): CompanyInfo {
  // Tu empresa es Responsable Inscripto (CUIT: 20-29907425-1)
  return {
    taxCondition: 'RESPONSABLE_INSCRIPTO',
    cuit: '20299074251',
    canIssue: ['FACTURA_A', 'FACTURA_B', 'TICKET'] // RI puede emitir A y B
  };
}

// ✅ VALIDACIONES DE COMPATIBILIDAD
// IMPORTANTE: Validaciones para emisor RESPONSABLE INSCRIPTO
export function validateInvoiceTypeForCustomer(
  invoiceType: InvoiceTypeUI,
  customerTaxCondition?: TaxConditionUI
): { valid: boolean; error?: string } {
  console.log(`🔍 Frontend validateInvoiceTypeForCustomer: ${invoiceType} para ${customerTaxCondition}`);
  
  if (!customerTaxCondition || invoiceType === 'TICKET') {
    return { valid: true }; // Sin cliente o tickets siempre válidos
  }

  // ✅ REGLAS AFIP ARGENTINA CORRECTAS
  // Para Responsable Inscripto (emisor) → Cliente (receptor)
  
  // Factura A: Solo entre Responsables Inscriptos
  if (invoiceType === 'FACTURA_A') {
    if (customerTaxCondition === 'RESPONSABLE_INSCRIPTO') {
      console.log(`✅ Frontend: FACTURA_A válida para RESPONSABLE_INSCRIPTO`);
      return { valid: true };
    } else {
      console.log(`❌ Frontend: FACTURA_A inválida para ${customerTaxCondition}`);
      return {
        valid: false,
        error: 'Factura A se emite solo entre Responsables Inscriptos'
      };
    }
  }
  
  // Factura B: De Responsable Inscripto a Monotributo, Exento, Consumidor Final, No Categorizado
  if (invoiceType === 'FACTURA_B') {
    if (['MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_CATEGORIZADO'].includes(customerTaxCondition)) {
      console.log(`✅ Frontend: FACTURA_B válida para ${customerTaxCondition}`);
      return { valid: true };
    } else {
      console.log(`❌ Frontend: FACTURA_B inválida para ${customerTaxCondition}`);
      return {
        valid: false,
        error: 'Factura B se emite desde Responsable Inscripto a Monotributistas, Exentos, Consumidores Finales y No Categorizados'
      };
    }
  }
  
  // Factura C: Solo para Monotributo EMISOR (no aplica para Responsables Inscriptos)
  if (invoiceType === 'FACTURA_C') {
    return {
      valid: false,
      error: 'Factura C solo puede ser emitida por Monotributistas, no por Responsables Inscriptos'
    };
  }
  
  return { valid: false, error: 'Tipo de factura no válido' };
}

export function validateDocumentTypeForTaxCondition(
  documentType: DocumentTypeUI,
  taxCondition: TaxConditionUI
): { valid: boolean; error?: string } {
  console.log("🔍 Validando documentType vs taxCondition:", { documentType, taxCondition });
  
  // Responsables Inscriptos deben tener CUIT
  if (taxCondition === 'RESPONSABLE_INSCRIPTO' && documentType !== 'CUIT') {
    console.log("❌ Validación falló: RI sin CUIT", { documentType, taxCondition });
    return {
      valid: false,
      error: 'Responsables Inscriptos deben tener CUIT'
    };
  }
  
  // Consumidores Finales pueden tener DNI o CF
  if (taxCondition === 'CONSUMIDOR_FINAL' && 
      !['DNI', 'CF'].includes(documentType)) {
    console.log("❌ Validación falló: CF con documento inválido", { documentType, taxCondition });
    return {
      valid: false,
      error: 'Consumidores Finales deben tener DNI o Consumidor Final'
    };
  }
  
  console.log("✅ Validación exitosa:", { documentType, taxCondition });
  return { valid: true };
}

// ✅ MATRIZ DE FACTURACIÓN - RESPONSABLE INSCRIPTO EMISOR (CORREGIDA)
// 
// ┌─────────────────────────────┬──────────────┬─────────────┬─────────────────────────────┐
// │         RECEPTOR            │ FACTURA TIPO │ CÓDIGO AFIP │         RAZÓN               │
// ├─────────────────────────────┼──────────────┼─────────────┼─────────────────────────────┤
// │ Responsable Inscripto       │ FACTURA_A    │     1       │ Entre RI (discrimina IVA)   │
// │ Monotributista              │ FACTURA_B    │     6       │ RI → Monotributo            │
// │ Exento                      │ FACTURA_B    │     6       │ RI → Exento                 │
// │ Consumidor Final            │ FACTURA_B    │     6       │ RI → CF (IVA incluido) ✅   │
// │ No Categorizado             │ FACTURA_B    │     6       │ Similar a CF ✅             │
// │ Sin Cliente                 │ TICKET       │     -       │ Venta mostrador             │
// └─────────────────────────────┴──────────────┴─────────────┴─────────────────────────────┘

// ✅ DETERMINACIÓN AUTOMÁTICA DE TIPO DE FACTURA
// IMPORTANTE: Esta función determina el tipo de factura que debe emitir
// un RESPONSABLE INSCRIPTO (emisor) hacia diferentes tipos de receptores
// 
// REGLAS AFIP CORRECTAS:
// - FACTURA_A (código 1): Responsable Inscripto → Responsable Inscripto
// - FACTURA_B (código 6): Responsable Inscripto → Monotributo, Exento, Consumidor Final, No Categorizado
// - FACTURA_C (código 11): Solo para Monotributo EMISOR (no aplica aquí)
export function determineInvoiceTypeForCustomer(
  customerTaxCondition?: TaxConditionUI
): InvoiceTypeUI {
  console.log(`🔍 Frontend determineInvoiceTypeForCustomer: ${customerTaxCondition}`);
  
  if (!customerTaxCondition) {
    return 'TICKET';
  }

  // ✅ EMISOR: Responsable Inscripto (empresa multitenant)
  // ✅ REGLAS AFIP ARGENTINA CORRECTAS:
  
  switch (customerTaxCondition) {
    case 'RESPONSABLE_INSCRIPTO':
      // RI → RI = Factura A (entre responsables inscriptos)
      console.log(`✅ Frontend: RESPONSABLE_INSCRIPTO → FACTURA_A`);
      return 'FACTURA_A';
      
    case 'MONOTRIBUTO':
      // RI → Monotributo = Factura B ✅ (corregido)
      console.log(`✅ Frontend: MONOTRIBUTO → FACTURA_B`);
      return 'FACTURA_B';
      
    case 'EXENTO':
      // RI → Exento = Factura B
      console.log(`✅ Frontend: EXENTO → FACTURA_B`);
      return 'FACTURA_B';
      
    case 'CONSUMIDOR_FINAL':
      // RI → Consumidor Final = Factura B ✅ (CORREGIDO - era FACTURA_C)
      console.log(`✅ Frontend: CONSUMIDOR_FINAL → FACTURA_B`);
      return 'FACTURA_B';
      
    case 'NO_CATEGORIZADO':
      // RI → No Categorizado = Factura B ✅ (CORREGIDO - era FACTURA_C)
      return 'FACTURA_B';
      
    default:
      // Para casos especiales, usar Factura B como más compatible
      return 'FACTURA_B';
  }
}

// ✅ INTERFACES PARA API
export interface StandardizedCustomer {
  id?: string;
  name: string;
  documentType: DocumentTypeUI;
  documentNumber: string;
  taxCondition: TaxConditionUI;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StandardizedCreateSaleRequest {
  employeeId: string;
  customerId?: string;
  customer?: StandardizedCustomer;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  invoiceType: InvoiceTypeUI;
  puntoVenta?: number;
  notes?: string;
  discount?: number;
}

export interface StandardizedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  category?: string;
}

export interface StandardizedInvoiceData {
  id: string;
  number: string;
  type: InvoiceTypeUI;
  date: Date;
  customer: StandardizedCustomer | null;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  items: StandardizedCartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia";
  cae?: string;
  caeExpirationDate?: Date;
  status?: "pending" | "completed" | "error";
}

// ✅ HELPERS PARA FORMATEO
export function formatDocumentNumber(number: string, type: DocumentTypeUI): string {
  if (!number) return '';
  
  const cleanNumber = number.replace(/\D/g, '');
  
  switch (type) {
    case 'CUIT':
    case 'CUIL':
      // Formato: XX-XXXXXXXX-X
      if (cleanNumber.length === 11) {
        return `${cleanNumber.slice(0, 2)}-${cleanNumber.slice(2, 10)}-${cleanNumber.slice(10)}`;
      }
      break;
    case 'DNI':
      // Formato: XX.XXX.XXX
      if (cleanNumber.length >= 7) {
        return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      break;
  }
  
  return number;
}

// ✅ NUEVA: Formatear para API (sin guiones ni puntos)
export function formatDocumentForAPI(number: string): string {
  return number.replace(/\D/g, ''); // Remover todo lo que no sea dígito
}

// ✅ NUEVA: Formatear para mostrar (con formato visual)
export function formatDocumentForDisplay(number: string, type: DocumentTypeUI): string {
  const cleanNumber = formatDocumentForAPI(number);
  
  switch (type) {
    case 'CUIT':
    case 'CUIL':
      if (cleanNumber.length === 11) {
        return `${cleanNumber.slice(0, 2)}-${cleanNumber.slice(2, 10)}-${cleanNumber.slice(10)}`;
      }
      break;
    case 'DNI':
      if (cleanNumber.length >= 7) {
        return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      break;
  }
  
  return cleanNumber;
}

export function validateDocumentNumber(number: string, type: DocumentTypeUI): boolean {
  const cleanNumber = number.replace(/\D/g, '');
  
  switch (type) {
    case 'CUIT':
    case 'CUIL':
      return cleanNumber.length === 11;
    case 'DNI':
      return cleanNumber.length >= 7 && cleanNumber.length <= 8;
    case 'CF':
      return true; // CF no requiere número
    case 'PASSPORT':
      return number.length >= 6; // Validación básica
    default:
      return false;
  }
}

// ✅ FUNCIÓN DE TEST ESPECÍFICA PARA MONOTRIBUTO
export function testMonotributoCase() {
  console.log('🧪 TEST ESPECÍFICO - CASO MONOTRIBUTO');
  console.log('===================================');
  
  // Simular cliente monotributista
  const monotributoClient = {
    name: 'Cliente Monotributista',
    taxStatus: 'MONOTRIBUTO' as TaxConditionUI,
    documentType: 'CUIL' as const,
    documentNumber: '23415422229'
  };
  
  console.log('📋 Cliente simulado:', monotributoClient);
  
  // Convertir taxStatus (simulando el proceso del componente)
  const standardizedTaxStatus = typeof monotributoClient.taxStatus === 'string' 
    ? convertLegacyTaxStatus(monotributoClient.taxStatus) || monotributoClient.taxStatus as TaxConditionUI
    : monotributoClient.taxStatus;
    
  console.log('� TaxStatus normalizado:', {
    original: monotributoClient.taxStatus,
    standardized: standardizedTaxStatus
  });
  
  // Determinar tipo de factura
  const suggestedType = determineInvoiceTypeForCustomer(standardizedTaxStatus);
  console.log('💡 Tipo de factura sugerido:', suggestedType);
  
  // Validar compatibilidad
  const validation = validateInvoiceTypeForCustomer(suggestedType, standardizedTaxStatus);
  console.log('✅ Validación:', validation);
  
  // Resultado esperado
  const expected = {
    invoiceType: 'FACTURA_A',
    valid: true
  };
  
  const success = suggestedType === expected.invoiceType && validation.valid === expected.valid;
  console.log(`${success ? '✅' : '❌'} Resultado: ${success ? 'CORRECTO' : 'ERROR'}`);
  
  return {
    success,
    suggestedType,
    validation,
    standardizedTaxStatus
  };
}
