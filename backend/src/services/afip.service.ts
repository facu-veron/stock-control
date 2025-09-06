// src/services/afip.service.ts - VERSIÓN OPTIMIZADA
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
} from "../types/afip-types";

export interface AfipInvoiceData {
  ptoVta: number;
  cbteTipo: AfipInvoiceType;
  docTipo: AfipDocumentType;
  docNro: number;
  impNeto: number;
  impIVA: number;
  impTotal: number;
  impTotConc?: number;
  impOpEx?: number;
  impTrib?: number;
  concepto?: 1 | 2 | 3;
  condicionIVAReceptorId?: AfipTaxCondition;
  taxStatus?: TaxConditionUI;
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

export class AfipService {
  private afipInstances: Map<string, Afip> = new Map();

  /**
   * Obtiene una instancia de AFIP para un tenant específico con cache
   */
  private async getAfipInstance(tenantId: string): Promise<Afip> {
    if (this.afipInstances.has(tenantId)) {
      return this.afipInstances.get(tenantId)!;
    }

    const credential = await prisma.afipCredential.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });

    if (!credential || !credential.tenant) {
      throw new Error("Credenciales AFIP no configuradas para este tenant");
    }

    const cuitNumber = parseInt(credential.tenant.cuit.replace(/\D/g, ""), 10);
    if (isNaN(cuitNumber)) {
      throw new Error(`CUIT inválido: ${credential.tenant.cuit}`);
    }

    const isProduction = credential.tenant.mode === "PRODUCCION";
    const afip = new Afip({
      cuit: cuitNumber,
      cert: credential.certPem,
      key: credential.keyPem,
      production: isProduction,
    });

    this.afipInstances.set(tenantId, afip);
    return afip;
  }

  // ✅ MÉTODOS BÁSICOS DE CONSULTA (usando la librería directamente)

  /**
   * Obtiene el último número de comprobante
   */
  async getLastVoucher(tenantId: string, ptoVta: number, cbteTipo: number): Promise<number> {
    try {
      const afip = await this.getAfipInstance(tenantId);
      const lastVoucher = await afip.electronicBillingService.getLastVoucher(ptoVta, cbteTipo);
      
      // La librería devuelve el número directamente
      return Number(lastVoucher) || 0;
    } catch (error) {
      console.error("❌ Error obteniendo último comprobante:", error);
      return 0;
    }
  }

  /**
   * Obtiene información de un comprobante específico
   */
  async getVoucherInfo(tenantId: string, cbteNro: number, ptoVta: number, cbteTipo: number) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getVoucherInfo(cbteNro, ptoVta, cbteTipo);
    } catch (error) {
      console.error("❌ Error obteniendo información del comprobante:", error);
      throw new Error(`Error obteniendo información del comprobante: ${error}`);
    }
  }

  /**
   * Obtiene los puntos de venta disponibles
   */
  async getPointsOfSale(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      const salesPoints = await afip.electronicBillingService.getSalesPoints();
      console.log("🔍 Puntos de venta recibidos:", salesPoints);
      return Array.isArray(salesPoints) ? salesPoints : [];
    } catch (error) {
      console.error("❌ Error obteniendo puntos de venta:", error);
      return [];
    }
  }

  // ✅ MÉTODOS DE TIPOS Y CONSULTAS (aprovechando la librería)

  /**
   * Obtiene todos los tipos de comprobantes disponibles desde AFIP
   */
  async getVoucherTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getVoucherTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de comprobante:", error);
      throw new Error("Error al obtener tipos de comprobante de AFIP");
    }
  }

  /**
   * Obtiene todos los tipos de conceptos disponibles desde AFIP
   */
  async getConceptTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getConceptTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de concepto:", error);
      throw new Error("Error al obtener tipos de concepto de AFIP");
    }
  }

  /**
   * Obtiene todos los tipos de documentos disponibles desde AFIP
   */
  async getDocumentTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getDocumentTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de documento:", error);
      throw new Error("Error al obtener tipos de documento de AFIP");
    }
  }

  /**
   * Obtiene todas las alícuotas de IVA disponibles desde AFIP
   */
  async getAliquotTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getAliquotTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de alícuota:", error);
      throw new Error("Error al obtener tipos de alícuota de AFIP");
    }
  }

  /**
   * Obtiene todos los tipos de monedas disponibles desde AFIP
   */
  async getCurrencyTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getCurrenciesTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de moneda:", error);
      throw new Error("Error al obtener tipos de moneda de AFIP");
    }
  }

  /**
   * Obtiene todos los tipos de opciones disponibles desde AFIP
   */
  async getOptionsTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getOptionsTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de opciones:", error);
      throw new Error("Error al obtener tipos de opciones de AFIP");
    }
  }

  /**
   * Obtiene todos los tipos de tributos disponibles desde AFIP
   */
  async getTaxTypes(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getTaxTypes();
    } catch (error) {
      console.error("❌ Error obteniendo tipos de tributos:", error);
      throw new Error("Error al obtener tipos de tributos de AFIP");
    }
  }

  /**
   * Obtiene el estado del servidor de AFIP
   */
  async getServerStatus(tenantId: string) {
    try {
      const afip = await this.getAfipInstance(tenantId);
      return await afip.electronicBillingService.getServerStatus();
    } catch (error) {
      console.error("❌ Error obteniendo estado del servidor:", error);
      throw new Error("Error al obtener estado del servidor AFIP");
    }
  }

  // ✅ MÉTODOS HELPERS MEJORADOS

  private resolveCondIVAReceptorId(params: {
    explicitId?: AfipTaxCondition;
    taxStatus?: TaxConditionUI;
    docTipo?: AfipDocumentType;
    cbteTipo?: AfipInvoiceType;
  }): AfipTaxCondition {
    console.log("🔍 Resolviendo CondicionIVAReceptorId:", params);
    
    if (params.explicitId) {
      return params.explicitId;
    }
    
    if (params.taxStatus) {
      try {
        return convertTaxConditionUIToAfip(params.taxStatus);
      } catch (error) {
        console.warn(`⚠️ Estado fiscal no reconocido: ${params.taxStatus}`);
      }
    }

    // Heurística mejorada
    if (params.docTipo === AFIP_DOCUMENT_TYPES.CF || params.docTipo === AFIP_DOCUMENT_TYPES.DNI) {
      return AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL;
    } else if (params.docTipo === AFIP_DOCUMENT_TYPES.CUIT) {
      if (params.cbteTipo === AFIP_INVOICE_TYPES.FACTURA_A) {
        return AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO;
      } else if (params.cbteTipo === AFIP_INVOICE_TYPES.FACTURA_B) {
        return AFIP_TAX_CONDITIONS.MONOTRIBUTO;
      } else {
        return AFIP_TAX_CONDITIONS.RESPONSABLE_INSCRIPTO;
      }
    }
    
    return AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL;
  }

  // ✅ MÉTODO PRINCIPAL: createVoucher (usando la librería directamente)

  /**
   * Crea un comprobante usando directamente createVoucher de la librería
   */
  async createVoucher(tenantId: string, invoiceData: AfipInvoiceData): Promise<AfipInvoiceResponse> {
    try {
      console.log("🔄 Iniciando facturación electrónica para tenant:", tenantId);

      const afip = await this.getAfipInstance(tenantId);

      // Obtener próximo número usando la librería
      const lastNumber = await this.getLastVoucher(tenantId, invoiceData.ptoVta, invoiceData.cbteTipo);
      const nextNumber = lastNumber + 1;

      const fechaCbte = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      // Resolver condición IVA del receptor
      const condIVAId = this.resolveCondIVAReceptorId({
        explicitId: invoiceData.condicionIVAReceptorId,
        taxStatus: invoiceData.taxStatus,
        docTipo: invoiceData.docTipo,
        cbteTipo: invoiceData.cbteTipo,
      });

      // ✅ Preparar datos usando la estructura exacta de afip.ts
      const voucherData: any = {
        CantReg: 1,
        PtoVta: invoiceData.ptoVta,
        CbteTipo: invoiceData.cbteTipo,
        Concepto: invoiceData.concepto ?? 1,
        DocTipo: invoiceData.docTipo,
        DocNro: invoiceData.docNro,
        CbteDesde: nextNumber,
        CbteHasta: nextNumber,
        CbteFch: fechaCbte, // String en lugar de number
        ImpTotal: Number(invoiceData.impTotal.toFixed(2)),
        ImpTotConc: Number((invoiceData.impTotConc || 0).toFixed(2)),
        ImpNeto: Number(invoiceData.impNeto.toFixed(2)),
        ImpOpEx: Number((invoiceData.impOpEx || 0).toFixed(2)),
        ImpIVA: Number(invoiceData.impIVA.toFixed(2)),
        ImpTrib: Number((invoiceData.impTrib || 0).toFixed(2)),
        MonId: "PES",
        MonCotiz: 1,
        CondicionIVAReceptorId: condIVAId,
      };

      // Agregar alícuotas si hay IVA
      if (invoiceData.impIVA > 0) {
        voucherData.Iva = [
          {
            Id: 5, // 21%
            BaseImp: Number(invoiceData.impNeto.toFixed(2)),
            Importe: Number(invoiceData.impIVA.toFixed(2)),
          },
        ];
      }

      console.log("📝 Enviando a AFIP:", voucherData);

      // ✅ Usar createVoucher directamente (recomendado por la documentación)
      const result: any = await afip.electronicBillingService.createVoucher(voucherData);
      console.log("✅ Respuesta de AFIP:", result);

      // ✅ MANEJO MEJORADO DE RESPUESTAS AFIP
      let cae = "";
      let caeFchVto = "";
      let resultado = "R";
      let observaciones: any[] = [];
      let errores: any[] = [];

      if (result && result.response) {
        // Extraer resultado general
        resultado = result.response.FeCabResp?.Resultado || "R";
        
        // Extraer errores si existen
        if (result.response.Errors?.Err) {
          errores = Array.isArray(result.response.Errors.Err) 
            ? result.response.Errors.Err 
            : [result.response.Errors.Err];
          console.error("❌ Errores AFIP:", errores);
        }

        // Extraer observaciones si existen
        if (result.response.FeDetResp?.FECAEDetResponse?.[0]?.Observaciones?.Obs) {
          observaciones = Array.isArray(result.response.FeDetResp.FECAEDetResponse[0].Observaciones.Obs)
            ? result.response.FeDetResp.FECAEDetResponse[0].Observaciones.Obs
            : [result.response.FeDetResp.FECAEDetResponse[0].Observaciones.Obs];
          console.warn("⚠️ Observaciones AFIP:", observaciones);
        }

        // Solo extraer CAE si el resultado es 'A' (Aprobado)
        if (resultado === "A") {
          const detResp = result.response.FeDetResp?.FECAEDetResponse?.[0] || {};
          cae = detResp.CAE || "";
          caeFchVto = detResp.CAEFchVto || "";
          console.log("✅ CAE obtenido:", { cae, caeFchVto });
        } else {
          console.error("❌ Factura rechazada por AFIP. Resultado:", resultado);
          await this.diagnoseAfipError(tenantId, result);
          if (errores.length > 0) {
            const errorMessages = errores.map((err: any) => `${err.Code}: ${err.Msg}`).join(", ");
            throw new Error(`Factura rechazada por AFIP: ${errorMessages}`);
          } else {
            throw new Error(`Factura rechazada por AFIP. Resultado: ${resultado}`);
          }
        }
      } else {
        // Formato directo sin wrapper 'response'
        cae = result.cae || result.CAE || "";
        caeFchVto = result.caeFchVto || result.CAEFchVto || "";
        resultado = result.resultado || result.Resultado || (cae ? "A" : "R");
      }

      const invoiceResponse: AfipInvoiceResponse = {
        cae,
        caeFchVto,
        cbteNumero: nextNumber,
        resultado,
        observaciones,
        errores,
      };

      // Guardar en base de datos solo si fue aprobado
      if (resultado === "A" && cae) {
        await this.saveInvoiceToDatabase(tenantId, {
          ptoVta: invoiceData.ptoVta,
          cbteTipo: invoiceData.cbteTipo,
          cbteNumero: nextNumber,
          cae,
          caeFchVto,
        });
      }

      return invoiceResponse;
    } catch (error) {
      console.error("❌ Error creando comprobante:", error);
      throw new Error(`Error en facturación electrónica: ${error}`);
    }
  }

  /**
   * ✅ ALTERNATIVA: createNextVoucher (maneja automáticamente el número siguiente)
   */
  async createNextVoucher(tenantId: string, invoiceData: AfipInvoiceData): Promise<AfipInvoiceResponse & { voucher_number: number }> {
    try {
      const afip = await this.getAfipInstance(tenantId);

      const fechaCbte = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const condIVAId = this.resolveCondIVAReceptorId({
        explicitId: invoiceData.condicionIVAReceptorId,
        taxStatus: invoiceData.taxStatus,
        docTipo: invoiceData.docTipo,
        cbteTipo: invoiceData.cbteTipo,
      });

      const voucherData: any = {
        CantReg: 1,
        PtoVta: invoiceData.ptoVta,
        CbteTipo: invoiceData.cbteTipo,
        Concepto: invoiceData.concepto ?? 1,
        DocTipo: invoiceData.docTipo,
        DocNro: invoiceData.docNro,
        CbteFch: fechaCbte, // String en lugar de number
        ImpTotal: Number(invoiceData.impTotal.toFixed(2)),
        ImpTotConc: Number((invoiceData.impTotConc || 0).toFixed(2)),
        ImpNeto: Number(invoiceData.impNeto.toFixed(2)),
        ImpOpEx: Number((invoiceData.impOpEx || 0).toFixed(2)),
        ImpIVA: Number(invoiceData.impIVA.toFixed(2)),
        ImpTrib: Number((invoiceData.impTrib || 0).toFixed(2)),
        MonId: "PES",
        MonCotiz: 1,
        CondicionIVAReceptorId: condIVAId,
      };

      if (invoiceData.impIVA > 0) {
        voucherData.Iva = [
          {
            Id: 5,
            BaseImp: Number(invoiceData.impNeto.toFixed(2)),
            Importe: Number(invoiceData.impIVA.toFixed(2)),
          },
        ];
      }

      // ✅ createNextVoucher maneja automáticamente el número siguiente
      const result: any = await afip.electronicBillingService.createNextVoucher(voucherData);
      console.log("✅ Respuesta createNextVoucher:", result);

      return {
        cae: result.cae || result.CAE || "",
        caeFchVto: result.caeFchVto || result.CAEFchVto || "",
        cbteNumero: result.voucherNumber || result.voucher_number || 0,
        voucher_number: result.voucherNumber || result.voucher_number || 0,
        resultado: "A",
        observaciones: [],
        errores: [],
      };
    } catch (error) {
      console.error("❌ Error con createNextVoucher:", error);
      throw new Error(`Error en createNextVoucher: ${error}`);
    }
  }

  // ✅ MÉTODO MEJORADO para procesar desde venta

  async procesarFacturacionFromSale(params: {
    tenantId: string;
    sale: any;
    tipoFactura: InvoiceTypeUI;
    puntoVenta: number;
    customer?: any;
  }): Promise<AfipInvoiceResponse> {
    const { tenantId, sale, tipoFactura, puntoVenta } = params;

    if (!sale?.id) {
      throw new Error("La venta debe tener un ID válido");
    }

    if (sale.tenantId !== tenantId) {
      throw new Error("Violación de seguridad multitenant");
    }

    const cbteTipo = convertInvoiceTypeUIToAfip(tipoFactura);
    
    // Determinar datos del cliente
    const customerData = params.customer || sale.customer;
    let docTipo: AfipDocumentType = AFIP_DOCUMENT_TYPES.CF;
    let docNro = 0;
    let taxStatus: TaxConditionUI | undefined;
    
    if (customerData?.documentType && customerData?.documentNumber) {
      try {
        docTipo = convertDocumentTypeUIToAfip(customerData.documentType as DocumentTypeUI);
        docNro = parseInt(String(customerData.documentNumber).replace(/\D/g, ""), 10);
        taxStatus = customerData.taxStatus as TaxConditionUI;
      } catch (error) {
        console.warn("⚠️ Tipo de documento no reconocido, usando CF");
        docTipo = AFIP_DOCUMENT_TYPES.CF;
        docNro = 0;
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
      taxStatus,
      concepto: sale.concepto as 1 | 2 | 3 | undefined,
      conceptoItems: sale.items?.map((item: any) => ({
        qty: item.quantity,
        description: item.productName,
        unitPrice: Number(item.unitPrice),
      })) || [],
    };

    try {
      // ✅ Usar createVoucher (método recomendado)
      const result = await this.createVoucher(tenantId, invoiceData);

      // Actualizar la venta
      const updateData: any = {
        cbteNro: result.cbteNumero,
        cbteTipo: cbteTipo,
        ptoVta: puntoVenta,
        afipStatus: result.cae ? "APPROVED" : "REJECTED",
        status: result.cae ? "CONFIRMED" : "DRAFT",
      };

      if (result.cae) {
        updateData.cae = result.cae;
      }

      if (result.caeFchVto) {
        const year = result.caeFchVto.substring(0, 4);
        const month = result.caeFchVto.substring(4, 6);
        const day = result.caeFchVto.substring(6, 8);
        updateData.caeVto = new Date(`${year}-${month}-${day}T23:59:59.000Z`);
      }

      await prisma.sale.updateMany({
        where: { id: sale.id, tenantId },
        data: updateData,
      });

      return result;
    } catch (error) {
      // Marcar error en la venta
      await prisma.sale.updateMany({
        where: { id: sale.id, tenantId },
        data: {
          afipStatus: "ERROR",
          afipError: error instanceof Error ? error.message : String(error),
        }
      });
      throw error;
    }
  }

  private async saveInvoiceToDatabase(tenantId: string, invoiceData: any): Promise<void> {
    try {
      // Implementa aquí la persistencia si la necesitas
      console.log("💾 Guardando factura en BD:", invoiceData);
    } catch (error) {
      console.error("❌ Error guardando factura en BD:", error);
    }
  }

  /**
   * Método auxiliar para diagnosticar errores AFIP
   */
  async diagnoseAfipError(tenantId: string, response: any): Promise<void> {
    console.log("🔍 DIAGNÓSTICO AFIP - Respuesta completa:", JSON.stringify(response, null, 2));
    
    if (response?.response?.Errors?.Err) {
      const errors = Array.isArray(response.response.Errors.Err) 
        ? response.response.Errors.Err 
        : [response.response.Errors.Err];
      
      console.log("❌ ERRORES AFIP DETECTADOS:");
      errors.forEach((error: any, index: number) => {
        console.log(`  ${index + 1}. Código: ${error.Code}, Mensaje: ${error.Msg}`);
      });
    }

    if (response?.response?.FeDetResp?.FECAEDetResponse?.[0]?.Observaciones?.Obs) {
      const obs = response.response.FeDetResp.FECAEDetResponse[0].Observaciones.Obs;
      const observations = Array.isArray(obs) ? obs : [obs];
      
      console.log("⚠️ OBSERVACIONES AFIP:");
      observations.forEach((obs: any, index: number) => {
        console.log(`  ${index + 1}. Código: ${obs.Code}, Mensaje: ${obs.Msg}`);
      });
    }

    // Verificar credenciales
    try {
      const status = await this.getServerStatus(tenantId);
      console.log("🔗 Estado servidor AFIP:", status);
    } catch (error) {
      console.error("❌ Error verificando estado AFIP:", error);
    }
  }
}

export const afipService = new AfipService();