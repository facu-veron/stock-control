// src/types/afip-types.ts
// Tipos estandarizados para facturación electrónica AFIP

// ✅ CÓDIGOS AFIP OFICIALES - Usar SOLO estos valores numéricos
export const AFIP_DOCUMENT_TYPES = {
  CUIT: 80,
  CUIL: 86, 
  DNI: 96,
  CF: 99, // Consumidor Final
  PASSPORT: 94,
} as const;

export const AFIP_INVOICE_TYPES = {
  FACTURA_A: 1,
  FACTURA_B: 6, 
  FACTURA_C: 11,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13,
  TICKET: 0, // Uso interno, no se envía a AFIP
} as const;

export const AFIP_TAX_CONDITIONS = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
  NO_CATEGORIZADO: 7,
  PROVEEDOR_EXTERIOR: 8,
  CLIENTE_EXTERIOR: 9,
  LIBERADO_LEY_19640: 10,
  MONOTRIBUTO_SOCIAL: 13,
  NO_ALCANZADO: 15,
  TRABAJADOR_INDEPENDIENTE_PROMOVIDO: 16,
} as const;

// ✅ TIPOS TYPESCRIPT DERIVADOS DE LOS CÓDIGOS OFICIALES
export type AfipDocumentType = typeof AFIP_DOCUMENT_TYPES[keyof typeof AFIP_DOCUMENT_TYPES];
export type AfipInvoiceType = typeof AFIP_INVOICE_TYPES[keyof typeof AFIP_INVOICE_TYPES];
export type AfipTaxCondition = typeof AFIP_TAX_CONDITIONS[keyof typeof AFIP_TAX_CONDITIONS];

// ✅ TIPOS STRING PARA UI (más legibles para el usuario)
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

// ✅ MAPPINGS DE CONVERSIÓN UI ↔ AFIP
export const UI_TO_AFIP_DOCUMENT_TYPE: Record<DocumentTypeUI, AfipDocumentType> = {
  CUIT: AFIP_DOCUMENT_TYPES.CUIT,
  CUIL: AFIP_DOCUMENT_TYPES.CUIL,
  DNI: AFIP_DOCUMENT_TYPES.DNI,
  CF: AFIP_DOCUMENT_TYPES.CF,
  PASSPORT: AFIP_DOCUMENT_TYPES.PASSPORT,
};

export const UI_TO_AFIP_INVOICE_TYPE: Record<InvoiceTypeUI, AfipInvoiceType> = {
  FACTURA_A: AFIP_INVOICE_TYPES.FACTURA_A,
  FACTURA_B: AFIP_INVOICE_TYPES.FACTURA_B,
  FACTURA_C: AFIP_INVOICE_TYPES.FACTURA_C,
  TICKET: AFIP_INVOICE_TYPES.TICKET,
};

export const UI_TO_AFIP_TAX_CONDITION: Record<TaxConditionUI, AfipTaxCondition> = {
  RESPONSABLE_INSCRIPTO: AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO,
  EXENTO: AFIP_TAX_CONDITIONS.EXENTO,
  CONSUMIDOR_FINAL: AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL,
  MONOTRIBUTO: AFIP_TAX_CONDITIONS.MONOTRIBUTO,
  NO_CATEGORIZADO: AFIP_TAX_CONDITIONS.NO_CATEGORIZADO,
  PROVEEDOR_EXTERIOR: AFIP_TAX_CONDITIONS.PROVEEDOR_EXTERIOR,
  CLIENTE_EXTERIOR: AFIP_TAX_CONDITIONS.CLIENTE_EXTERIOR,
  LIBERADO_LEY_19640: AFIP_TAX_CONDITIONS.LIBERADO_LEY_19640,
  MONOTRIBUTO_SOCIAL: AFIP_TAX_CONDITIONS.MONOTRIBUTO_SOCIAL,
  NO_ALCANZADO: AFIP_TAX_CONDITIONS.NO_ALCANZADO,
  TRABAJADOR_INDEPENDIENTE_PROMOVIDO: AFIP_TAX_CONDITIONS.TRABAJADOR_INDEPENDIENTE_PROMOVIDO,
};

// ✅ MAPPINGS INVERSOS AFIP ↔ UI
export const AFIP_TO_UI_DOCUMENT_TYPE: Record<AfipDocumentType, DocumentTypeUI> = {
  [AFIP_DOCUMENT_TYPES.CUIT]: 'CUIT',
  [AFIP_DOCUMENT_TYPES.CUIL]: 'CUIL', 
  [AFIP_DOCUMENT_TYPES.DNI]: 'DNI',
  [AFIP_DOCUMENT_TYPES.CF]: 'CF',
  [AFIP_DOCUMENT_TYPES.PASSPORT]: 'PASSPORT',
};

export const AFIP_TO_UI_INVOICE_TYPE: Record<AfipInvoiceType, InvoiceTypeUI> = {
  [AFIP_INVOICE_TYPES.FACTURA_A]: 'FACTURA_A',
  [AFIP_INVOICE_TYPES.FACTURA_B]: 'FACTURA_B',
  [AFIP_INVOICE_TYPES.FACTURA_C]: 'FACTURA_C',
  [AFIP_INVOICE_TYPES.TICKET]: 'TICKET',
  [AFIP_INVOICE_TYPES.NOTA_DEBITO_A]: 'FACTURA_A', // Fallback
  [AFIP_INVOICE_TYPES.NOTA_DEBITO_B]: 'FACTURA_B', // Fallback
  [AFIP_INVOICE_TYPES.NOTA_DEBITO_C]: 'FACTURA_C', // Fallback
  [AFIP_INVOICE_TYPES.NOTA_CREDITO_A]: 'FACTURA_A', // Fallback
  [AFIP_INVOICE_TYPES.NOTA_CREDITO_B]: 'FACTURA_B', // Fallback
  [AFIP_INVOICE_TYPES.NOTA_CREDITO_C]: 'FACTURA_C', // Fallback
};

export const AFIP_TO_UI_TAX_CONDITION: Record<AfipTaxCondition, TaxConditionUI> = {
  [AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO]: 'RESPONSABLE_INSCRIPTO',
  [AFIP_TAX_CONDITIONS.EXENTO]: 'EXENTO',
  [AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL]: 'CONSUMIDOR_FINAL',
  [AFIP_TAX_CONDITIONS.MONOTRIBUTO]: 'MONOTRIBUTO',
  [AFIP_TAX_CONDITIONS.NO_CATEGORIZADO]: 'NO_CATEGORIZADO',
  [AFIP_TAX_CONDITIONS.PROVEEDOR_EXTERIOR]: 'PROVEEDOR_EXTERIOR',
  [AFIP_TAX_CONDITIONS.CLIENTE_EXTERIOR]: 'CLIENTE_EXTERIOR',
  [AFIP_TAX_CONDITIONS.LIBERADO_LEY_19640]: 'LIBERADO_LEY_19640',
  [AFIP_TAX_CONDITIONS.MONOTRIBUTO_SOCIAL]: 'MONOTRIBUTO_SOCIAL',
  [AFIP_TAX_CONDITIONS.NO_ALCANZADO]: 'NO_ALCANZADO',
  [AFIP_TAX_CONDITIONS.TRABAJADOR_INDEPENDIENTE_PROMOVIDO]: 'TRABAJADOR_INDEPENDIENTE_PROMOVIDO',
};

// ✅ FUNCIONES DE CONVERSIÓN HELPER
export function convertDocumentTypeUIToAfip(uiType: DocumentTypeUI): AfipDocumentType {
  return UI_TO_AFIP_DOCUMENT_TYPE[uiType];
}

export function convertDocumentTypeAfipToUI(afipType: AfipDocumentType): DocumentTypeUI {
  return AFIP_TO_UI_DOCUMENT_TYPE[afipType];
}

export function convertInvoiceTypeUIToAfip(uiType: InvoiceTypeUI): AfipInvoiceType {
  return UI_TO_AFIP_INVOICE_TYPE[uiType];
}

export function convertInvoiceTypeAfipToUI(afipType: AfipInvoiceType): InvoiceTypeUI {
  return AFIP_TO_UI_INVOICE_TYPE[afipType];
}

export function convertTaxConditionUIToAfip(uiCondition: TaxConditionUI): AfipTaxCondition {
  return UI_TO_AFIP_TAX_CONDITION[uiCondition];
}

export function convertTaxConditionAfipToUI(afipCondition: AfipTaxCondition): TaxConditionUI {
  return AFIP_TO_UI_TAX_CONDITION[afipCondition];
}

// ✅ VALIDACIONES DE COMPATIBILIDAD
export function validateInvoiceTypeForCustomer(
  invoiceType: InvoiceTypeUI,
  customerTaxCondition: TaxConditionUI
): { valid: boolean; error?: string } {
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
  // Responsables Inscriptos deben tener CUIT
  if (taxCondition === 'RESPONSABLE_INSCRIPTO' && documentType !== 'CUIT') {
    return {
      valid: false,
      error: 'Responsables Inscriptos deben tener CUIT'
    };
  }
  
  // Consumidores Finales pueden tener DNI o CF
  if (taxCondition === 'CONSUMIDOR_FINAL' && 
      !['DNI', 'CF'].includes(documentType)) {
    return {
      valid: false,
      error: 'Consumidores Finales deben tener DNI o Consumidor Final'
    };
  }
  
  return { valid: true };
}

// ✅ INTERFACES PARA REQUESTS Y RESPONSES
export interface AfipCustomerData {
  name: string;
  documentType: AfipDocumentType;
  documentNumber: string;
  taxCondition: AfipTaxCondition;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AfipInvoiceRequest {
  tenantId: string;
  customerId?: string;
  customer?: AfipCustomerData;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  invoiceType: AfipInvoiceType;
  puntoVenta: number;
  employeeId: string;
  notes?: string;
  discount?: number;
}

export interface AfipInvoiceResponse {
  saleId: string;
  invoiceNumber: string;
  cae?: string;
  caeExpirationDate?: string;
  afipStatus: 'APPROVED' | 'REJECTED' | 'ERROR';
  errors?: string[];
  observations?: string[];
}
