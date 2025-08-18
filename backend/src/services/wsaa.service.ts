// src/services/wsaa.service.ts
import { PrismaClient } from "@prisma/client"
import forge from "node-forge"
import { createClientAsync } from "soap"
import { XMLBuilder, XMLParser } from "fast-xml-parser"

const prisma = new PrismaClient()
const WSAA_WSDL = process.env.WSAA_WSDL || "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL"
const SERVICE_ID = "wsfe"
const RENEW_BUFFER_MS = Number(process.env.WSAA_RENEW_BUFFER_MS || 10 * 60 * 1000)

function buildTRAXML(service: string) {
  const now = new Date()
  const gen = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const exp = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()

  const builder = new XMLBuilder({ ignoreAttributes: false })
  return builder.build({
    loginTicketRequest: {
      header: {
        uniqueId: Math.floor(Date.now() / 1000),
        generationTime: gen,
        expirationTime: exp,
      },
      service,
    },
  })
}

function signCMS(traXml: string, certPem: string, keyPem: string) {
  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(traXml, "utf8")
  const cert = forge.pki.certificateFromPem(certPem)
  const key = forge.pki.privateKeyFromPem(keyPem)

  p7.addCertificate(cert)
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
  })
  p7.sign({ detached: false })
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
  const derBuffer = Buffer.from(der, "binary")
  return derBuffer.toString("base64")
}

export async function getOrRenewTA(tenantId: string) {
  const cred = await prisma.afipCredential.findUnique({
    where: { tenantId },
    include: { token: true, tenant: true },
  })
  if (!cred) throw new Error("AFIP credencial no configurada para el tenant")

  const now = Date.now()
  if (cred.token) {
    const exp = new Date(cred.token.expirationTime).getTime()
    if (exp - now > RENEW_BUFFER_MS) {
      return {
        token: cred.token.token,
        sign: cred.token.sign,
        generationTime: cred.token.generationTime,
        expirationTime: cred.token.expirationTime,
      }
    }
  }

  const tra = buildTRAXML(cred.service || SERVICE_ID)
  const cmsB64 = signCMS(tra, cred.certPem, cred.keyPem)

  const client = await createClientAsync(WSAA_WSDL)
  const [resp] = await client.loginCmsAsync({ in0: cmsB64 })
  const xml = resp?.loginCmsReturn as string
  if (!xml) throw new Error("WSAA sin respuesta")

  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml)
  const ltr = parsed?.loginTicketResponse
  if (!ltr?.credentials?.token || !ltr?.credentials?.sign) {
    throw new Error("WSAA inválido (sin token/sign)")
  }

  const generation = new Date(ltr.header.generationTime)
  const expiration = new Date(ltr.header.expirationTime)

  const saved = await prisma.afipToken.upsert({
    where: { credentialId: cred.id },
    update: {
      token: ltr.credentials.token,
      sign: ltr.credentials.sign,
      generationTime: generation,
      expirationTime: expiration,
      rawXml: xml,
    },
    create: {
      credentialId: cred.id,
      token: ltr.credentials.token,
      sign: ltr.credentials.sign,
      generationTime: generation,
      expirationTime: expiration,
      rawXml: xml,
    },
  })

  return {
    token: saved.token,
    sign: saved.sign,
    generationTime: saved.generationTime,
    expirationTime: saved.expirationTime,
  }
}
