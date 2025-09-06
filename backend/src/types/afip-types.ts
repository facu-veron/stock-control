// src/types/afip-types.ts - TIPOS Y CONSTANTES AFIP

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES AFIP (Códigos oficiales)
// ─────────────────────────────────────────────────────────────────────────────

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
} as const;

export const AFIP_TAX_CONDITIONS = {
  RESPONSABLE_INSCRIPTO: 1,
  EXENTO: 2,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
  RESPONSABLE_NO_INSCRIPTO: 7,
  PROVEEDOR_EXTERIOR: 8,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS TypeScript
// ─────────────────────────────────────────────────────────────────────────────

export type AfipDocumentType = typeof AFIP_DOCUMENT_TYPES[keyof typeof AFIP_DOCUMENT_TYPES];
export type AfipInvoiceType = typeof AFIP_INVOICE_TYPES[keyof typeof AFIP_INVOICE_TYPES];
export type AfipTaxCondition = typeof AFIP_TAX_CONDITIONS[keyof typeof AFIP_TAX_CONDITIONS];

// Tipos UI (lo que ve el usuario)
export type DocumentTypeUI = 'DNI' | 'CUIT' | 'CUIL' | 'CF' | 'PASSPORT';
export type InvoiceTypeUI = 'TICKET' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
export type TaxConditionUI = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO' | 'CONSUMIDOR_FINAL';

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE CONVERSIÓN
// ─────────────────────────────────────────────────────────────────────────────

export function convertDocumentTypeUIToAfip(docType: DocumentTypeUI): AfipDocumentType {
  const mapping: Record<DocumentTypeUI, AfipDocumentType> = {
    'DNI': AFIP_DOCUMENT_TYPES.DNI,
    'CUIT': AFIP_DOCUMENT_TYPES.CUIT,
    'CUIL': AFIP_DOCUMENT_TYPES.CUIL,
    'CF': AFIP_DOCUMENT_TYPES.CF,
    'PASSPORT': AFIP_DOCUMENT_TYPES.PASSPORT,
  };
  return mapping[docType];
}

export function convertInvoiceTypeUIToAfip(invoiceType: InvoiceTypeUI): AfipInvoiceType {
  const mapping: Record<Exclude<InvoiceTypeUI, 'TICKET'>, AfipInvoiceType> = {
    'FACTURA_A': AFIP_INVOICE_TYPES.FACTURA_A,
    'FACTURA_B': AFIP_INVOICE_TYPES.FACTURA_B,
    'FACTURA_C': AFIP_INVOICE_TYPES.FACTURA_C,
  };
  
  if (invoiceType === 'TICKET') {
    throw new Error('Los tickets no se procesan en AFIP');
  }
  
  return mapping[invoiceType];
}

export function convertTaxConditionUIToAfip(taxCondition: TaxConditionUI): AfipTaxCondition {
  const mapping: Record<TaxConditionUI, AfipTaxCondition> = {
    'RESPONSABLE_INSCRIPTO': AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO,
    'MONOTRIBUTO': AFIP_TAX_CONDITIONS.MONOTRIBUTO,
    'EXENTO': AFIP_TAX_CONDITIONS.EXENTO,
    'CONSUMIDOR_FINAL': AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL,
  };
  return mapping[taxCondition];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES DE VALIDACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export function validateDocumentTypeForTaxCondition(
  docType: DocumentTypeUI,
  taxStatus: TaxConditionUI
): { valid: boolean; error?: string } {
  // CUIT solo para responsables inscriptos y monotributistas
  if (docType === 'CUIT' && !['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO'].includes(taxStatus)) {
    return {
      valid: false,
      error: 'CUIT solo es válido para Responsables Inscriptos y Monotributistas'
    };
  }
  
  // CF solo para consumidores finales
  if (docType === 'CF' && taxStatus !== 'CONSUMIDOR_FINAL') {
    return {
      valid: false,
      error: 'Consumidor Final (CF) solo es válido para estado fiscal "Consumidor Final"'
    };
  }
  
  // DNI generalmente para consumidores finales
  if (docType === 'DNI' && taxStatus === 'RESPONSABLE_INSCRIPTO') {
    return {
      valid: false,
      error: 'Responsables Inscriptos deben usar CUIT en lugar de DNI'
    };
  }
  
  return { valid: true };
}

export function validateInvoiceTypeForCustomer(
  invoiceType: InvoiceTypeUI,
  taxStatus: TaxConditionUI
): { valid: boolean; error?: string } {
  if (invoiceType === 'TICKET') {
    return { valid: true }; // Tickets son válidos para todos
  }
  
  // Factura A solo para responsables inscriptos
  if (invoiceType === 'FACTURA_A' && taxStatus !== 'RESPONSABLE_INSCRIPTO') {
    return {
      valid: false,
      error: 'Factura A solo se puede emitir a Responsables Inscriptos'
    };
  }
  
  // Factura B para monotributo y exentos
  if (invoiceType === 'FACTURA_B' && !['MONOTRIBUTO', 'EXENTO'].includes(taxStatus)) {
    return {
      valid: false,
      error: 'Factura B se emite a Monotributistas y Exentos'
    };
  }
  
  // Factura C para consumidores finales
  if (invoiceType === 'FACTURA_C' && taxStatus !== 'CONSUMIDOR_FINAL') {
    return {
      valid: false,
      error: 'Factura C se emite a Consumidores Finales'
    };
  }
  
  return { valid: true };
}