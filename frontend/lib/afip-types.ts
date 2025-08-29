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
    'Exento': 'EXENTO',
    'Consumidor Final': 'CONSUMIDOR_FINAL',
    'No Categorizado': 'NO_CATEGORIZADO',
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

// ✅ VALIDACIONES DE COMPATIBILIDAD
export function validateInvoiceTypeForCustomer(
  invoiceType: InvoiceTypeUI,
  customerTaxCondition?: TaxConditionUI
): { valid: boolean; error?: string } {
  if (!customerTaxCondition) {
    return { valid: true }; // Sin cliente es válido para tickets
  }

  // Factura A solo para Responsables Inscriptos
  if (invoiceType === 'FACTURA_A' && customerTaxCondition !== 'RESPONSABLE_INSCRIPTO') {
    return {
      valid: false,
      error: 'Factura A solo puede emitirse a Responsables Inscriptos'
    };
  }
  
  // Factura C solo para Consumidores Finales y No Categorizados
  if (invoiceType === 'FACTURA_C' && 
      !['CONSUMIDOR_FINAL', 'NO_CATEGORIZADO'].includes(customerTaxCondition)) {
    return {
      valid: false,
      error: 'Factura C solo puede emitirse a Consumidores Finales o No Categorizados'
    };
  }
  
  return { valid: true };
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

// ✅ DETERMINACIÓN AUTOMÁTICA DE TIPO DE FACTURA
export function determineInvoiceTypeForCustomer(
  customerTaxCondition?: TaxConditionUI
): InvoiceTypeUI {
  if (!customerTaxCondition) {
    return 'TICKET';
  }

  switch (customerTaxCondition) {
    case 'RESPONSABLE_INSCRIPTO':
      return 'FACTURA_A';
    case 'MONOTRIBUTO':
    case 'EXENTO':
      return 'FACTURA_B';
    case 'CONSUMIDOR_FINAL':
    case 'NO_CATEGORIZADO':
      return 'FACTURA_B'; // O FACTURA_C según el negocio
    default:
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
