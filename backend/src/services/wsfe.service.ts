// src/services/afip/wsfe.ts
import soap from "soap"

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
