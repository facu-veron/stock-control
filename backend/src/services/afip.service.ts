// src/services/afip.service.ts
import { Afip } from "afip.ts";
import { prisma } from "../lib/prisma";

export type CondicionIVAReceptorId =
  | 1   // Responsable Inscripto
  | 4   // Sujeto Exento
  | 5   // Consumidor Final
  | 6   // Responsable Monotributo
  | 7   // No Categorizado
  | 8   // Proveedor del Exterior
  | 9   // Cliente del Exterior
  | 10  // IVA Liberado – Ley 19.640
  | 13  // Monotributista Social
  | 15  // IVA No Alcanzado
  | 16; // Monotributo Trabajador Independiente Promovido

export type CustomerTaxStatus =
  | "RESPONSABLE_INSCRIPTO"
  | "MONOTRIBUTO"
  | "EXENTO"
  | "CONSUMIDOR_FINAL"
  | "NO_CATEGORIZADO"
  | "NO_ALCANZADO"
  | "LIBERADO_19640"
  | "MONOTRIBUTO_SOCIAL"
  | "TRABAJADOR_PROMOVIDO"
  | "EXTERIOR_PROVEEDOR"
  | "EXTERIOR_CLIENTE";

export interface AfipInvoiceData {
  ptoVta: number;
  cbteTipo: number; // 6 = Factura B, 1 = Factura A, 11 = Factura C
  docTipo: number;  // 99 = CF, 80 = CUIT, 96 = DNI
  docNro: number;
  impNeto: number;
  impIVA: number;
  impTotal: number;
  impTotConc?: number;
  impOpEx?: number;
  impTrib?: number;

  // NUEVO: permitir indicar concepto y condición IVA del receptor
  concepto?: 1 | 2 | 3; // 1=Productos, 2=Servicios, 3=Ambos
  condicionIVAReceptorId?: CondicionIVAReceptorId; // override explícito
  taxStatus?: CustomerTaxStatus; // inferencia a partir de estado fiscal del cliente

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

  /** Mapea estado fiscal del cliente a CondicionIVAReceptorId */
  private mapTaxStatusToCondId(status?: CustomerTaxStatus): CondicionIVAReceptorId | undefined {
    switch (status) {
      case "RESPONSABLE_INSCRIPTO": return 1;
      case "EXENTO": return 4;
      case "CONSUMIDOR_FINAL": return 5;
      case "MONOTRIBUTO": return 6;
      case "NO_CATEGORIZADO": return 7;
      case "EXTERIOR_PROVEEDOR": return 8;
      case "EXTERIOR_CLIENTE": return 9;
      case "LIBERADO_19640": return 10;
      case "MONOTRIBUTO_SOCIAL": return 13;
      case "NO_ALCANZADO": return 15;
      case "TRABAJADOR_PROMOVIDO": return 16;
      default: return undefined;
    }
  }

  /**
   * Resuelve CondicionIVAReceptorId:
   * 1) si viene explícito, lo usa;
   * 2) si hay taxStatus, lo mapea;
   * 3) heurística por DocTipo:
   *    - 99 (CF) o 96 (DNI) => 5 (Consumidor Final)
   *    - 80 (CUIT) => 1 (RI) por defecto (ajustá según tus datos de cliente)
   */
  private resolveCondIVAReceptorId(params: {
    explicitId?: CondicionIVAReceptorId;
    taxStatus?: CustomerTaxStatus;
    docTipo?: number;
  }): CondicionIVAReceptorId {
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

    // Heurística por DocTipo
    let result: CondicionIVAReceptorId;
    if (params.docTipo === 99 || params.docTipo === 96) {
      result = 5; // Consumidor Final
      console.log("✅ Heurística por DocTipo (99/96 - CF):", result);
    } else if (params.docTipo === 80) {
      result = 1; // RI por default si no sabemos más
      console.log("✅ Heurística por DocTipo (80 - CUIT -> RI):", result);
    } else {
      result = 5; // Consumidor Final como fallback más seguro para Factura B
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
  async procesarFacturacionFromSale(params: {
    tenantId: string;
    sale: any;
    tipoFactura: string;
    puntoVenta: number;
    customer?: any; // Customer inline opcional
  }): Promise<AfipInvoiceResponse> {
    const { tenantId, sale, tipoFactura, puntoVenta } = params;

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
  }
}

export const afipService = new AfipService();
