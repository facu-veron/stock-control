// src/services/afip/wsfe.ts
import soap from "soap"
import { prisma } from "../../lib/prisma";

const WSFE_WSDL_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
const WSFE_WSDL_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

export async function createWsfeClient(prod = false) {
  const wsdl = prod ? WSFE_WSDL_PROD : WSFE_WSDL_HOMO
  const client = await soap.createClientAsync(wsdl)
  return client as any
}

export async function getLastVoucher({
  client,
  token,
  sign,
  cuit,
  ptoVta,
  cbteTipo,
}: {
  client: any
  token: string
  sign: string
  cuit: string
  ptoVta: number
  cbteTipo: number
}): Promise<number> {
  const [result] = await client.FECompUltimoAutorizadoAsync({
    Auth: { Token: token, Sign: sign, Cuit: Number(cuit) },
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
  })
  const n = Number(result?.FECompUltimoAutorizadoResult?.CbteNro ?? 0)
  return n
}

// ------- buildFeCAERequest (Factura B, IVA 21%) -------
/**
 * Minimalista: contempla 1 alícuota 21% y totales ya calculados en la venta.
 * cbteTipo Factura B = 6
 * docTipo: Consumidor Final = 99; CUIT = 80; DNI = 96
 */
export function buildFeCAERequest(args: {
  ptoVta: number
  cbteTipo: number // 6 (Factura B) en esta versión
  cbteNumero: number
  fechaCbte: string // yyyymmdd
  totals: {
    impNeto: number // neto gravado
    impIVA: number
    impTotal: number
    impTotConc?: number
    impOpEx?: number
    impTrib?: number
  }
  receptor: { docTipo: number; docNro: number }
  items: Array<{ qty: number; description: string; unitPriceNeto: number }>
}) {
  const { ptoVta, cbteTipo, cbteNumero, fechaCbte, totals, receptor, items } = args

  // Alicuota 21% (Id=5)
  const base21 = Number(totals.impNeto.toFixed(2))
  const iva21 = Number(totals.impIVA.toFixed(2))

  // Arma el detalle WSFE
  const detalle = {
    Concepto: 1, // 1: Productos
    DocTipo: receptor.docTipo, // 99 CF, 80 CUIT, 96 DNI
    DocNro: receptor.docNro,
    CbteDesde: cbteNumero,
    CbteHasta: cbteNumero,
    CbteFch: fechaCbte,
    ImpTotal: Number(totals.impTotal.toFixed(2)),
    ImpTotConc: Number((totals.impTotConc ?? 0).toFixed(2)),
    ImpNeto: base21,
    ImpOpEx: Number((totals.impOpEx ?? 0).toFixed(2)),
    ImpIVA: iva21,
    ImpTrib: Number((totals.impTrib ?? 0).toFixed(2)),
    MonId: "PES",
    MonCotiz: 1,
    Iva: {
      AlicIva: [
        {
          Id: 5, // 21%
          BaseImp: base21,
          Importe: iva21,
        },
      ],
    },
    // Opcional: Detalle por ítems (no requerido por AFIP para WSFE, se envía totalizado)
  }

  return {
    FeCAEReq: {
      FeCabReq: {
        CantReg: 1,
        PtoVta: ptoVta,
        CbteTipo: cbteTipo,
      },
      FeDetReq: {
        FECAEDetRequest: [detalle],
      },
    },
  }
}

export async function solicitarCAE({
  client,
  token,
  sign,
  cuit,
  feCAEReq,
}: {
  client: any
  token: string
  sign: string
  cuit: string
  feCAEReq: any
}) {
  const [resp] = await client.FECAESolicitarAsync({
    Auth: { Token: token, Sign: sign, Cuit: Number(cuit) },
    FeCAEReq: feCAEReq.FeCAEReq,
  })
  return resp?.FECAESolicitarResult
}

export async function obtenerPuntosVentaAFIP(tenantId: string) {
  // 1. Obtener credenciales y token
  const credential = await prisma.afipCredential.findUnique({
    where: { tenantId },
    include: { token: true, tenant: true }
  });
  if (!credential || !credential.token || !credential.tenant) throw new Error('Credenciales AFIP no configuradas');
  const prod = credential.tenant.mode === 'PRODUCCION';
  const client = await createWsfeClient(prod);
  // 2. Llamar a FEParamGetPtosVentaAsync
  const [result] = await client.FEParamGetPtosVentaAsync({
    Auth: {
      Token: credential.token.token,
      Sign: credential.token.sign,
      Cuit: Number(credential.tenant.cuit)
    }
  });
  // 3. Mapear puntos de venta
  const puntos = result?.FEParamGetPtosVentaResult?.ResultGet || [];
  return puntos;
}

export async function procesarFacturacionAFIP({ tenantId, sale, tipoFactura, puntoVenta }: { tenantId: string, sale: any, tipoFactura: string, puntoVenta: number }) {
  // 1. Obtener credenciales y token
  const credential = await prisma.afipCredential.findUnique({
    where: { tenantId },
    include: { token: true, tenant: true }
  });
  if (!credential || !credential.token || !credential.tenant) throw new Error('Credenciales AFIP no configuradas');
  const prod = credential.tenant.mode === 'PRODUCCION';
  const client = await createWsfeClient(prod);
  // 2. Armar feCAEReq
  const fechaCbte = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const feCAEReq = buildFeCAERequest({
    ptoVta: puntoVenta,
    cbteTipo: 6, // Factura B
    cbteNumero: 1, // Deberías obtener el último número autorizado y sumar 1
    fechaCbte,
    totals: {
      impNeto: Number(sale.subtotal),
      impIVA: Number(sale.taxTotal),
      impTotal: Number(sale.grandTotal)
    },
    receptor: { docTipo: 99, docNro: 0 },
    items: sale.items.map((item: any) => ({ qty: item.quantity, description: item.productName, unitPriceNeto: Number(item.unitPrice) }))
  });
  // 3. Llamar a solicitarCAE
  const resp = await solicitarCAE({
    client,
    token: credential.token.token,
    sign: credential.token.sign,
    cuit: credential.tenant.cuit,
    feCAEReq
  });
  return resp;
}
