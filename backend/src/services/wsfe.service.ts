// src/services/wsfe.service.ts
import { createClientAsync } from "soap"
import { PrismaClient } from "@prisma/client"
import { getOrRenewTA } from "./wsaa.service"

const prisma = new PrismaClient()
const WSDL_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
const WSDL_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"

async function getWsdlForTenant(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) throw new Error("Tenant no encontrado")
  return t.mode === "PRODUCCION" ? WSDL_PROD : WSDL_HOMO
}

async function getAuthForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error("Tenant no encontrado")
  const ta = await getOrRenewTA(tenantId)
  return { auth: { Token: ta.token, Sign: ta.sign, Cuit: Number(tenant.cuit) } }
}

export async function feCompUltimoAutorizado(tenantId: string, ptoVta: number, cbteTipo: number) {
  const wsdl = await getWsdlForTenant(tenantId)
  const client = await createClientAsync(wsdl)
  const { auth } = await getAuthForTenant(tenantId)
  const [res] = await client.FECompUltimoAutorizadoAsync({ Auth: auth, PtoVta: ptoVta, CbteTipo: cbteTipo })
  return res?.FECompUltimoAutorizadoResult
}

export async
