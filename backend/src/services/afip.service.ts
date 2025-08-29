// src/services/afip.service.ts
import { Afip } from "afip.ts";
import { prisma } from "../lib/prisma";
import {
  AFIP_DOCUMENT_TYPES,
  AFIP_INVOICE_TYPES,
  AFIP_TAX_CONDITIONS,
  type AfipDocumentType,
  type AfipInvoiceType,
  type AfipTaxCondition,
  type TaxConditionUI,
  type InvoiceTypeUI,
  type DocumentTypeUI,
  convertTaxConditionUIToAfip,
  convertDocumentTypeUIToAfip,
  convertInvoiceTypeUIToAfip,
  validateInvoiceTypeForCustomer,
  validateDocumentTypeForTaxCondition,
} from "../types/afip-types";

// ✅ TIPOS HEREDADOS (mantener compatibilidad temporal)
export type CondicionIVAReceptorId = AfipTaxCondition;
export type CustomerTaxStatus = TaxConditionUI;

export interface AfipInvoiceData {
  ptoVta: number;
  cbteTipo: AfipInvoiceType; // ✅ Usar códigos AFIP tipados
  docTipo: AfipDocumentType; // ✅ Usar códigos AFIP tipados
  docNro: number;
  impNeto: number;
  impIVA: number;
  impTotal: number;
  impTotConc?: number;
  impOpEx?: number;
  impTrib?: number;

  // ✅ NUEVO: permitir indicar concepto y condición IVA del receptor
  concepto?: 1 | 2 | 3; // 1=Productos, 2=Servicios, 3=Ambos
  condicionIVAReceptorId?: AfipTaxCondition; // ✅ override explícito tipado
  taxStatus?: TaxConditionUI; // ✅ inferencia a partir de estado fiscal del cliente

  // (solo uso informativo para tus propios registros)
  conceptoItems: Array<{
    qty: number;
    description: string;
    unitPrice: number;
  }>;
}

export interface AfipInvoiceResponse {
  cae: string;
  caeFchVto: string;
  cbteNumero: number;
  resultado: string;
  observaciones?: any[];
  errores?: any[];
}
export interface AfipResult {
  cae: string;           // Sin ? si siempre debe estar presente
  caeFchVto: string;     // Sin ? si siempre debe estar presente  
  cbteNumero: number;    // Sin ? si siempre debe estar presente
  resultado?: string;
  observaciones?: any[];
  errores?: any[];
}

export class AfipService {
  private getAfipInstance(cuit: string, certPem: string, keyPem: string, isProduction = false): Afip {
    const cuitNumber = parseInt(cuit.replace(/\D/g, ""), 10);
    if (isNaN(cuitNumber)) {
      throw new Error(`CUIT inválido: ${cuit}`);
    }
    return new Afip({
      cuit: cuitNumber,
      cert: certPem,
      key: keyPem,
      production: isProduction,
    });
  }

  // ---- HELPERS NUEVOS ----

  /** Lee CbteNro robustamente sin importar si viene con mayúscula/minúscula o como número directo */
  private parseLastVoucherNumber(last: any): number {
    if (last == null) return 0;
    if (typeof last === "number") return last;
    const n =
      last.CbteNro ??
      last.cbteNro ??
      last.VoucherNumber ??
      last.voucherNumber ??
      0;
    const num = Number(n);
    return Number.isFinite(num) ? num : 0;
  }

  /** ✅ Mapea estado fiscal del cliente a CondicionIVAReceptorId usando tipos estandarizados */
  private mapTaxStatusToCondId(status?: TaxConditionUI): AfipTaxCondition | undefined {
    if (!status) return undefined;
    
    try {
      return convertTaxConditionUIToAfip(status);
    } catch (error) {
      console.warn(`⚠️ Estado fiscal no reconocido: ${status}`);
      return undefined;
    }
  }

  /**
   * ✅ Resuelve CondicionIVAReceptorId usando tipos estandarizados:
   * 1) si viene explícito, lo usa;
   * 2) si hay taxStatus, lo mapea;
   * 3) heurística por DocTipo usando códigos AFIP oficiales
   * 4) considera el tipo de comprobante para evitar incompatibilidades
   */
  private resolveCondIVAReceptorId(params: {
    explicitId?: AfipTaxCondition;
    taxStatus?: TaxConditionUI;
    docTipo?: AfipDocumentType;
    cbteTipo?: AfipInvoiceType; // ✅ NUEVO: considerar tipo de comprobante
  }): AfipTaxCondition {
    console.log("🔍 Resolviendo CondicionIVAReceptorId:", params);
    
    if (params.explicitId) {
      console.log("✅ Usando ID explícito:", params.explicitId);
      return params.explicitId;
    }
    
    const fromStatus = this.mapTaxStatusToCondId(params.taxStatus);
    if (fromStatus) {
      console.log("✅ Mapeado desde taxStatus:", params.taxStatus, "->", fromStatus);
      return fromStatus;
    }

    // ✅ Heurística mejorada considerando tipo de comprobante y DocTipo
    let result: AfipTaxCondition;
    
    if (params.docTipo === AFIP_DOCUMENT_TYPES.CF || params.docTipo === AFIP_DOCUMENT_TYPES.DNI) {
      result = AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL;
      console.log("✅ Heurística por DocTipo (CF/DNI -> CF):", result);
    } else if (params.docTipo === AFIP_DOCUMENT_TYPES.CUIT) {
      // ✅ Para CUIT, considerar el tipo de comprobante
      if (params.cbteTipo === AFIP_INVOICE_TYPES.FACTURA_A) {
        result = AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO; // Factura A siempre RI
        console.log("✅ Heurística CUIT + FACTURA_A -> RI:", result);
      } else if (params.cbteTipo === AFIP_INVOICE_TYPES.FACTURA_B) {
        result = AFIP_TAX_CONDITIONS.MONOTRIBUTO; // Factura B con CUIT probablemente Monotrib
        console.log("✅ Heurística CUIT + FACTURA_B -> MONOTRIBUTO:", result);
      } else {
        result = AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO; // Default para otros casos
        console.log("✅ Heurística CUIT (otro tipo) -> RI:", result);
      }
    } else {
      result = AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL; // Fallback más seguro
      console.log("✅ Fallback seguro (CF):", result);
    }
    
    return result;
  }

  // ------------------------

  async createInvoice(tenantId: string, invoiceData: AfipInvoiceData): Promise<AfipInvoiceResponse> {
    try {
      console.log("🔄 Iniciando facturación electrónica para tenant:", tenantId);
      console.log("📋 Datos de factura:", JSON.stringify(invoiceData, null, 2));

      // Obtener credenciales del tenant
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { tenant: true },
      });
      if (!credential || !credential.tenant) {
        throw new Error("Credenciales AFIP no configuradas para este tenant");
      }

      console.log("🏢 Tenant encontrado:", credential.tenant.name, "CUIT:", credential.tenant.cuit);

      const isProduction = credential.tenant.mode === "PRODUCCION";
      const afip = this.getAfipInstance(
        credential.tenant.cuit,
        credential.certPem,
        credential.keyPem,
        isProduction
      );

      console.log("🔍 Obteniendo último número de comprobante...");
      console.log("📍 Punto de venta:", invoiceData.ptoVta, "Tipo comprobante:", invoiceData.cbteTipo);

      const lastInvoiceNumber = await afip.electronicBillingService.getLastVoucher(
        invoiceData.ptoVta,
        invoiceData.cbteTipo
      );

      console.log("📄 Último comprobante AFIP:", JSON.stringify(lastInvoiceNumber, null, 2));
      const lastNumber = this.parseLastVoucherNumber(lastInvoiceNumber);
      const nextInvoiceNumber = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
      console.log("🔢 Próximo número de comprobante:", nextInvoiceNumber);

      const fechaCbte = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      // Resolver Condición IVA del receptor (OBLIGATORIO desde RG 5616)
      const condIVAId = this.resolveCondIVAReceptorId({
        explicitId: invoiceData.condicionIVAReceptorId,
        taxStatus: invoiceData.taxStatus,
        docTipo: invoiceData.docTipo,
        cbteTipo: invoiceData.cbteTipo, // ✅ NUEVO: considerar tipo de comprobante
      });

      // Preparar datos para afip.ts (estructura que acepta la lib)
      const invoice: any = {
        CantReg: 1,
        PtoVta: invoiceData.ptoVta,
        CbteTipo: invoiceData.cbteTipo,
        Concepto: invoiceData.concepto ?? 1, // default: Productos
        DocTipo: invoiceData.docTipo,
        DocNro: invoiceData.docNro,
        CbteDesde: nextInvoiceNumber,
        CbteHasta: nextInvoiceNumber,
        CbteFch: fechaCbte,

        ImpTotal: Number(invoiceData.impTotal.toFixed(2)),
        ImpTotConc: Number((invoiceData.impTotConc || 0).toFixed(2)),
        ImpNeto: Number(invoiceData.impNeto.toFixed(2)),
        ImpOpEx: Number((invoiceData.impOpEx || 0).toFixed(2)),
        ImpIVA: Number(invoiceData.impIVA.toFixed(2)),
        ImpTrib: Number((invoiceData.impTrib || 0).toFixed(2)),

        MonId: "PES",
        MonCotiz: 1,

        // NUEVO: obligatorio → Condición frente al IVA del receptor
        CondicionIVAReceptorId: condIVAId,
      };

      // Agregar alícuotas si corresponde
      if (invoiceData.impIVA > 0) {
        invoice.Iva = [
          {
            Id: 5, // 21%
            BaseImp: Number(invoiceData.impNeto.toFixed(2)),
            Importe: Number(invoiceData.impIVA.toFixed(2)),
          },
        ];
      }

      console.log("📝 Datos de factura a enviar a AFIP:", JSON.stringify(invoice, null, 2));
      console.log("🔍 CondicionIVAReceptorId resuelto:", condIVAId);

      console.log("🚀 Enviando factura a AFIP...");
      const result = await afip.electronicBillingService.createInvoice(invoice);

      console.log("✅ Respuesta de AFIP:", JSON.stringify(result, null, 2));

      const response = (result as any).response || result;
      const detResp = (response as any).FeDetResp?.FECAEDetResponse?.[0] || {};
      const cabResp = (response as any).FeCabResp || {};

      const cae = detResp.CAE || (result as any).cae || "";
      const caeFchVto = detResp.CAEFchVto || (result as any).caeFchVto || "";
      const resultado = detResp.Resultado || cabResp.Resultado || "R";
      const observaciones = detResp.Observaciones?.Obs || [];
      const errores = (response as any).Errors?.Err || [];

      console.log("📊 Datos extraídos:", { cae, caeFchVto, resultado, observaciones, errores });

      await this.saveInvoiceToDatabase(tenantId, {
        ptoVta: invoiceData.ptoVta,
        cbteTipo: invoiceData.cbteTipo,
        cbteNumero: nextInvoiceNumber,
        cae,
        caeFchVto,
        resultado,
        observaciones,
        errores,
      });

      return {
        cae,
        caeFchVto,
        cbteNumero: nextInvoiceNumber,
        resultado,
        observaciones,
        errores,
      };
    } catch (error) {
      console.error("Error creando factura con AFIP:", error);
      throw new Error(`Error en facturación electrónica: ${(error as any).message || error}`);
    }
  }

  async getPointsOfSale(tenantId: string): Promise<any[]> {
    try {
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { tenant: true },
      });
      if (!credential || !credential.tenant) {
        return [];
      }

      const isProduction = credential.tenant.mode === "PRODUCCION";
      const afip = this.getAfipInstance(
        credential.tenant.cuit,
        credential.certPem,
        credential.keyPem,
        isProduction
      );

      const pointsOfSale = await afip.electronicBillingService.getSalesPoints();
      console.log("🔍 Puntos de venta recibidos:", JSON.stringify(pointsOfSale, null, 2));

      const response = pointsOfSale as any;
      const result =
        response?.PtoVenta ||
        response?.salesPoints ||
        response?.data ||
        (Array.isArray(pointsOfSale) ? pointsOfSale : []);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("Error obteniendo puntos de venta:", error);
      return [];
    }
  }

  async getVoucherInfo(tenantId: string, number: number, salePoint: number, type: number): Promise<any> {
    try {
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { tenant: true },
      });
      if (!credential || !credential.tenant) {
        throw new Error("Credenciales AFIP no configuradas para este tenant");
      }

      const isProduction = credential.tenant.mode === "PRODUCCION";
      const afip = this.getAfipInstance(
        credential.tenant.cuit,
        credential.certPem,
        credential.keyPem,
        isProduction
      );

      return await afip.electronicBillingService.getVoucherInfo(number, salePoint, type);
    } catch (error) {
      console.error("Error obteniendo información del comprobante:", error);
      throw new Error(`Error obteniendo información del comprobante: ${(error as any).message || error}`);
    }
  }

  private async saveInvoiceToDatabase(tenantId: string, invoiceData: any): Promise<void> {
    try {
      // Implementá aquí si querés persistir AfipInvoice
    } catch (error) {
      console.error("Error guardando factura en base de datos:", error);
    }
  }

  // Procesa facturación desde una venta de tu sistema
 /*  async procesarFacturacionFromSale(params: {
    tenantId: string;
    sale: any;
    tipoFactura: string;
    puntoVenta: number;
    customer?: any; // Customer inline opcional
  }): Promise<AfipInvoiceResponse> {
    const { tenantId, sale, tipoFactura, puntoVenta } = params;
    // VALIDACIÓN CRÍTICA: Verificar que la venta tenga ID
    if (!sale || !sale.id) {
      throw new Error("La venta debe tener un ID válido antes de procesar la facturación");
    }
    const tiposFactura = {
      FACTURA_A: 1,
      FACTURA_B: 6,
      FACTURA_C: 11,
    } as const;

    const cbteTipo = (tiposFactura as any)[tipoFactura];
    if (!cbteTipo) {
      throw new Error(`Tipo de factura no válido: ${tipoFactura}`);
    }

    // Doc del receptor - puede venir del customer de la sale O del parámetro customer inline
    let docTipo = 99; // CF por defecto
    let docNro = 0;
    let taxStatus: CustomerTaxStatus | undefined;
    
    // Priorizar customer inline en params, luego sale.customer
    const customerData = params.customer || sale.customer;
    
    if (customerData && customerData.documentType && customerData.documentNumber) {
      switch (customerData.documentType) {
        case "CUIT":
          docTipo = 80;
          docNro = parseInt(String(customerData.documentNumber).replace(/\D/g, ""), 10);
          break;
        case "DNI":
          docTipo = 96;
          docNro = parseInt(String(customerData.documentNumber).replace(/\D/g, ""), 10);
          break;
        default:
          docTipo = 99;
          docNro = 0;
      }
      taxStatus = customerData.taxStatus as CustomerTaxStatus;
    }
    
    console.log("👤 Datos del receptor:", { docTipo, docNro, taxStatus, hasCustomer: !!customerData });

    if (cbteTipo === 1 && docTipo !== 80) {
      throw new Error("Para Factura A, el cliente debe tener CUIT válido");
    }

    const invoiceData: AfipInvoiceData = {
      ptoVta: puntoVenta,
      cbteTipo,
      docTipo,
      docNro,
      impNeto: Number(sale.subtotal || 0),
      impIVA: Number(sale.taxTotal || 0),
      impTotal: Number(sale.grandTotal || 0),

      // NUEVO: pasamos señales para CondicionIVAReceptorId
      taxStatus: taxStatus,
      // si ya lo traés normalizado en tu modelo, podrías setear:
      // condicionIVAReceptorId: <id>,

      // opcional: si facturás servicios
      concepto: sale.concepto as 1 | 2 | 3 | undefined,

      conceptoItems:
        sale.items?.map((item: any) => ({
          qty: item.quantity,
          description: item.productName,
          unitPrice: Number(item.unitPrice),
        })) || [],
    };

    const result = await this.createInvoice(tenantId, invoiceData);

    const updateData: any = {
      cbteNro: result.cbteNumero,
      cbteTipo: cbteTipo,
      ptoVta: puntoVenta,
    };

    if (result.cae && result.cae.trim() !== "") {
      updateData.cae = result.cae;
      updateData.status = "COMPLETED";
    } else {
      updateData.status = "DRAFT";
      updateData.afipError = `Factura rechazada por AFIP. Errores/Obs: ${JSON.stringify(
        result.errores || result.observaciones
      )}`;
    }

    if (result.caeFchVto && result.caeFchVto.trim() !== "") {
      const year = result.caeFchVto.substring(0, 4);
      const month = result.caeFchVto.substring(4, 6);
      const day = result.caeFchVto.substring(6, 8);
      updateData.caeVto = new Date(`${year}-${month}-${day}T23:59:59.000Z`);
    }

    await prisma.sale.update({
      where: { id: sale.id },
      data: updateData,
    });

    return result;
  } */
// ✅ Procesa facturación desde una venta de tu sistema - VERSIÓN MEJORADA CON TIPOS
async procesarFacturacionFromSale(params: {
  tenantId: string;
  sale: any;
  tipoFactura: InvoiceTypeUI;
  puntoVenta: number;
  customer?: any;
}): Promise<AfipInvoiceResponse> {
  const { tenantId, sale, tipoFactura, puntoVenta } = params;

  // ✅ VALIDACIÓN CRÍTICA: Verificar integridad de datos
  if (!tenantId) {
    throw new Error("TenantId es requerido para procesar facturación");
  }

  if (!sale) {
    throw new Error("Datos de venta son requeridos para procesar facturación");
  }

  if (!sale.id) {
    throw new Error("La venta debe tener un ID válido antes de procesar la facturación AFIP");
  }

  // Validar que la venta pertenece al tenant
  if (sale.tenantId !== tenantId) {
    throw new Error("La venta no pertenece al tenant especificado - Violación de seguridad multitenant");
  }

  // ✅ Usar convertidor tipado para obtener código AFIP
  let cbteTipo: AfipInvoiceType;
  try {
    cbteTipo = convertInvoiceTypeUIToAfip(tipoFactura);
  } catch (error) {
    throw new Error(`Tipo de factura no válido: ${tipoFactura}`);
  }

  // Validar montos de la venta
  if (!sale.grandTotal || sale.grandTotal <= 0) {
    throw new Error("La venta debe tener un monto total válido");
  }

  console.log("🔍 Procesando facturación AFIP:", {
    saleId: sale.id,
    tenantId,
    tipoFactura,
    puntoVenta,
    grandTotal: sale.grandTotal
  });

  // ✅ Doc del receptor - puede venir del customer de la sale O del parámetro customer inline
  let docTipo: AfipDocumentType = AFIP_DOCUMENT_TYPES.CF; // CF por defecto
  let docNro = 0;
  let taxStatus: TaxConditionUI | undefined;
  
  // Priorizar customer inline en params, luego sale.customer
  const customerData = params.customer || sale.customer;
  
  if (customerData && customerData.documentType && customerData.documentNumber) {
    try {
      // ✅ Convertir documentType de UI a código AFIP
      const documentTypeUI = customerData.documentType as DocumentTypeUI;
      docTipo = convertDocumentTypeUIToAfip(documentTypeUI);
      docNro = parseInt(String(customerData.documentNumber).replace(/\D/g, ""), 10);
      
      // ✅ Validar que el número de documento sea válido
      if (isNaN(docNro) || docNro <= 0) {
        throw new Error(`Número de documento inválido: ${customerData.documentNumber}`);
      }
      
    } catch (error) {
      console.warn("⚠️ Tipo de documento no reconocido, usando CF:", customerData.documentType);
      docTipo = AFIP_DOCUMENT_TYPES.CF;
      docNro = 0;
    }
    
    taxStatus = customerData.taxStatus as TaxConditionUI;
  }
  
  console.log("👤 Datos del receptor:", { docTipo, docNro, taxStatus, hasCustomer: !!customerData });

  // ✅ Validación mejorada para Factura A
  if (cbteTipo === AFIP_INVOICE_TYPES.FACTURA_A) {
    if (docTipo !== AFIP_DOCUMENT_TYPES.CUIT) {
      throw new Error("Para Factura A, el cliente debe tener CUIT válido");
    }
    if (!taxStatus || taxStatus !== 'RESPONSABLE_INSCRIPTO') {
      throw new Error("Para Factura A, el cliente debe ser Responsable Inscripto");
    }
  }

  const invoiceData: AfipInvoiceData = {
    ptoVta: puntoVenta,
    cbteTipo,
    docTipo,
    docNro,
    impNeto: Number(sale.subtotal || 0),
    impIVA: Number(sale.taxTotal || 0),
    impTotal: Number(sale.grandTotal || 0),

    // NUEVO: pasamos señales para CondicionIVAReceptorId
    taxStatus: taxStatus,
    
    // opcional: si facturás servicios
    concepto: sale.concepto as 1 | 2 | 3 | undefined,

    conceptoItems:
      sale.items?.map((item: any) => ({
        qty: item.quantity,
        description: item.productName,
        unitPrice: Number(item.unitPrice),
      })) || [],
  };

  try {
    const result = await this.createInvoice(tenantId, invoiceData);

    // ✅ VALIDACIÓN: Solo actualizar si tenemos un ID válido de venta
    if (!sale.id) {
      throw new Error("No se puede actualizar la venta: ID de venta no válido");
    }

    const updateData: any = {
      cbteNro: result.cbteNumero,
      cbteTipo: cbteTipo,
      ptoVta: puntoVenta,
    };

    if (result.cae && result.cae.trim() !== "") {
      updateData.cae = result.cae;
      updateData.status = "CONFIRMED"; // Cambiado de COMPLETED a CONFIRMED para consistencia
      updateData.afipStatus = "APPROVED";
    } else {
      updateData.status = "DRAFT";
      updateData.afipStatus = "REJECTED";
      updateData.afipError = `Factura rechazada por AFIP. Errores/Obs: ${JSON.stringify(
        result.errores || result.observaciones
      )}`;
    }

    if (result.caeFchVto && result.caeFchVto.trim() !== "") {
      const year = result.caeFchVto.substring(0, 4);
      const month = result.caeFchVto.substring(4, 6);
      const day = result.caeFchVto.substring(6, 8);
      updateData.caeVto = new Date(`${year}-${month}-${day}T23:59:59.000Z`);
    }

    // ✅ SEGURIDAD MULTITENANT: Actualizar con filtro de tenant
    const updatedSale = await prisma.sale.updateMany({
      where: { 
        id: sale.id,
        tenantId: tenantId // ✅ CRÍTICO: Filtro de seguridad multitenant
      },
      data: updateData,
    });

    if (updatedSale.count === 0) {
      throw new Error("No se pudo actualizar la venta - Posible violación de seguridad multitenant");
    }

    console.log("✅ Venta actualizada con datos AFIP:", {
      saleId: sale.id,
      cae: result.cae,
      cbteNumero: result.cbteNumero
    });

    return result;

  } catch (error) {
    console.error("❌ Error en procesarFacturacionFromSale:", {
      saleId: sale.id,
      tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Registrar el error en la venta si es posible
    try {
      await prisma.sale.updateMany({
        where: { 
          id: sale.id,
          tenantId: tenantId
        },
        data: {
          afipStatus: "ERROR",
          afipError: error instanceof Error ? error.message : String(error)
        }
      });
    } catch (updateError) {
      console.error("❌ No se pudo actualizar el error en la venta:", updateError);
    }

    throw error;
  }
}
  }

export const afipService = new AfipService();
