// src/cron/wsaa-refresh.ts
import { PrismaClient } from "@prisma/client"
import { getOrRenewTA } from "../services/wsaa.service"

const prisma = new PrismaClient()

export async function scheduleWsaaAutoRefresh() {
  const EVERY = Number(process.env.WSAA_CRON_EVERY_MS || 5 * 60 * 1000)

  async function tick() {
    try {
      const creds = await prisma.afipCredential.findMany({ include: { tenant: true, token: true } })
      for (const c of creds) {
        try {
          await getOrRenewTA(c.tenantId) // esto ya renueva con buffer
        } catch (err) {
          console.error(`[WSAA] Falló refresh tenant=${c.tenantId}:`, err)
        }
      }
    } catch (e) {
      console.error("[WSAA] Scan tenants error:", e)
    } finally {
      setTimeout(tick, EVERY)
    }
  }

  setTimeout(tick, 5_000) // arranca a los 5s de levantar el server
}
