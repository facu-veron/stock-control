// src/cron/wsaa-refresh.ts
import { PrismaClient } from "@prisma/client"
import { getOrRenewTA } from "../services/arca/wsaa.service"

const prisma = new PrismaClient()

export async function scheduleWsaaAutoRefresh() {
  const EVERY = Number(process.env.WSAA_CRON_EVERY_MS || 5 * 60 * 1000)
  
  async function tick() {
    try {
      console.log(`[WSAA] Iniciando refresh automático de tokens...`)
      
      // Buscar todas las credenciales AFIP activas con sus tenants y tokens
      const creds = await prisma.afipCredential.findMany({
        include: { 
          tenant: {
            select: {
              id: true,
              name: true,
              cuit: true,
              mode: true,
            }
          }, 
          token: true 
        },
        // Solo procesar credenciales de tenants que tienen datos completos
        where: {
          tenant: {
            // Opcional: agregar filtros si quieres solo ciertos tenants
            // mode: 'PRODUCCION' // Solo producción, por ejemplo
          }
        }
      })
      
      console.log(`[WSAA] Encontradas ${creds.length} credenciales para procesar`)
      
      // Procesar credenciales en paralelo con límite de concurrencia
      const MAX_CONCURRENT = Number(process.env.WSAA_MAX_CONCURRENT || 3)
      
      for (let i = 0; i < creds.length; i += MAX_CONCURRENT) {
        const batch = creds.slice(i, i + MAX_CONCURRENT)
        
        await Promise.allSettled(
          batch.map(async (cred) => {
            const tenantInfo = `tenant=${cred.tenant.name}(${cred.tenant.cuit})`
            
            try {
              console.log(`[WSAA] Procesando ${tenantInfo}...`)
              
              // Verificar si el token necesita renovación
              const needsRenewal = shouldRenewToken(cred.token)
              
              if (!needsRenewal) {
                console.log(`[WSAA] ${tenantInfo} - Token aún válido, saltando`)
                return
              }
              
              console.log(`[WSAA] ${tenantInfo} - Renovando token...`)
              await getOrRenewTA(cred.tenantId)
              
              console.log(`[WSAA] ${tenantInfo} - Token renovado exitosamente`)
              
            } catch (err) {
              console.error(`[WSAA] Error renovando ${tenantInfo}:`, {
                error: err instanceof Error ? err.message : String(err),
                tenantId: cred.tenantId,
                credentialId: cred.id,
              })
              
              // Opcional: registrar el error en base de datos
              await logTokenError(cred.tenantId, err).catch(() => {
                // Ignorar errores de logging para no afectar el cron principal
              })
            }
          })
        )
        
        // Pequeña pausa entre batches para no sobrecargar AFIP
        if (i + MAX_CONCURRENT < creds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`[WSAA] Refresh automático completado`)
      
    } catch (e) {
      console.error("[WSAA] Error en scan de tenants:", {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })
    } finally {
      // Programar siguiente ejecución
      setTimeout(tick, EVERY)
    }
  }
  
  // Arrancar el cron después de 5 segundos
  console.log(`[WSAA] Programando refresh automático cada ${EVERY}ms`)
  setTimeout(tick, 5_000)
}

/**
 * Determina si un token necesita renovación basándose en su tiempo de expiración
 * y un buffer de seguridad
 */
function shouldRenewToken(token: any): boolean {
  if (!token) {
    return true // No hay token, necesita renovación
  }
  
  const now = new Date()
  const expirationTime = new Date(token.expirationTime)
  
  // Buffer de seguridad (por defecto 30 minutos antes de expirar)
  const BUFFER_MS = Number(process.env.WSAA_RENEWAL_BUFFER_MS || 30 * 60 * 1000)
  const renewalTime = new Date(expirationTime.getTime() - BUFFER_MS)
  
  const needsRenewal = now >= renewalTime
  
  if (needsRenewal) {
    console.log(`[WSAA] Token expira en: ${Math.round((expirationTime.getTime() - now.getTime()) / 1000 / 60)} minutos`)
  }
  
  return needsRenewal
}

/**
 * Registra errores de renovación de tokens en la base de datos
 * para análisis posterior
 */
async function logTokenError(tenantId: string, error: unknown): Promise<void> {
  try {
    // Opcional: crear una tabla de logs de errores o usar la tabla de audit
    await prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'AfipToken',
        entityId: tenantId,
        action: 'RENEWAL_ERROR',
        newValues: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          source: 'wsaa-cron'
        }
      }
    }).catch(() => {
      // Si falla el audit log, solo registrar en consola
      console.warn(`[WSAA] No se pudo guardar error en audit log para tenant ${tenantId}`)
    })
  } catch (e) {
    // Ignorar errores de logging
  }
}

/**
 * Función auxiliar para obtener estadísticas de tokens
 * Útil para monitoring
 */
export async function getTokenStats(): Promise<{
  total: number
  expired: number
  expiringSoon: number
  valid: number
}> {
  try {
    const tokens = await prisma.afipToken.findMany({
      select: {
        expirationTime: true,
      }
    })
    
    const now = new Date()
    const BUFFER_MS = Number(process.env.WSAA_RENEWAL_BUFFER_MS || 30 * 60 * 1000)
    
    let expired = 0
    let expiringSoon = 0
    let valid = 0
    
    for (const token of tokens) {
      const expirationTime = new Date(token.expirationTime)
      const renewalTime = new Date(expirationTime.getTime() - BUFFER_MS)
      
      if (now >= expirationTime) {
        expired++
      } else if (now >= renewalTime) {
        expiringSoon++
      } else {
        valid++
      }
    }
    
    return {
      total: tokens.length,
      expired,
      expiringSoon,
      valid
    }
  } catch (error) {
    console.error('[WSAA] Error obteniendo estadísticas:', error)
    return { total: 0, expired: 0, expiringSoon: 0, valid: 0 }
  }
}

/**
 * Función para ejecutar refresh manual de un tenant específico
 * Útil para testing o troubleshooting
 */
export async function refreshTokenForTenant(tenantId: string): Promise<void> {
  try {
    console.log(`[WSAA] Refresh manual para tenant ${tenantId}`)
    await getOrRenewTA(tenantId)
    console.log(`[WSAA] Refresh manual completado para tenant ${tenantId}`)
  } catch (error) {
    console.error(`[WSAA] Error en refresh manual para tenant ${tenantId}:`, error)
    throw error
  }
}