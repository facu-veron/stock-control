// src/jobs/afip-token-renewal.job.ts
import cron from "node-cron";
import { WsaaService } from "../services/arca/wsaa.service";
import { prisma } from "../lib/prisma";
import type { ScheduledTask } from "node-cron";

export class AfipTokenRenewalJob {
  private wsaaService: WsaaService;
  private job: ScheduledTask | null = null;
  constructor() {
    this.wsaaService = new WsaaService();
  }

  /**
   * Inicia el cron job para renovación de tokens
   * Se ejecuta cada 12 horas como recomienda AFIP
   */
  start(): void {
    // Cron expression: cada 12 horas (a las 00:00 y 12:00)
    const cronExpression = "0 0,12 * * *";
    
    this.job = cron.schedule(cronExpression, async () => {
      console.log("⏰ Iniciando renovación automática de tokens AFIP...");
      await this.renewTokens();
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    });

    console.log("✅ Cron job de renovación de tokens AFIP iniciado");
    
    // Ejecutar una vez al iniciar para asegurar tokens válidos
    this.renewTokensOnStartup();
  }

  /**
   * Detiene el cron job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      console.log("⏹️ Cron job de renovación de tokens AFIP detenido");
    }
  }

  /**
   * Renueva tokens al iniciar la aplicación
   */
  private async renewTokensOnStartup(): Promise<void> {
    console.log("🚀 Verificando tokens AFIP al inicio...");
    await this.renewTokens();
  }

  /**
   * Proceso principal de renovación de tokens
   */
  private async renewTokens(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Obtener todas las credenciales AFIP con sus relaciones
      const credentials = await prisma.afipCredential.findMany({
        include: {
          tenant: true,
          token: true
        }
      });

      console.log(`📊 Encontradas ${credentials.length} credenciales AFIP para procesar`);

      const results = {
        success: 0,
        skipped: 0,
        failed: 0
      };

      // Procesar cada credencial
      for (const credential of credentials) {
        // Verificar que el tenant existe
        if (!credential.tenant) {
          console.log(`⏭️ Saltando credencial sin tenant asociado`);
          results.skipped++;
          continue;
        }

        try {
          // Verificar si el token necesita renovación
          const needsRenewal = this.tokenNeedsRenewal(credential.token);

          if (needsRenewal) {
            console.log(`🔄 Renovando token para: ${credential.tenant.name} (${credential.tenant.mode})`);
            
            const renewed = await this.wsaaService.getOrRenewToken(credential.tenantId, true);
            
            if (renewed) {
              console.log(`✅ Token renovado exitosamente para: ${credential.tenant.name}`);
              results.success++;
              
              // Registrar en audit log
              await this.logTokenRenewal(credential.tenantId, "SUCCESS");
            } else {
              throw new Error("No se pudo renovar el token");
            }
          } else {
            console.log(`⏭️ Token aún válido para: ${credential.tenant.name}`);
            results.skipped++;
          }
        } catch (error) {
          console.error(`❌ Error renovando token para ${credential.tenant.name}:`, error);
          results.failed++;
          
          // Registrar el error
          await this.logTokenRenewal(credential.tenantId, "FAILED", error);
          
          // Notificar al administrador del tenant (opcional)
          await this.notifyTokenRenewalFailure(credential.tenantId, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`
📊 Resumen de renovación de tokens:
   ✅ Exitosos: ${results.success}
   ⏭️ Omitidos: ${results.skipped}
   ❌ Fallidos: ${results.failed}
   ⏱️ Tiempo total: ${duration}ms
      `);

    } catch (error) {
      console.error("❌ Error crítico en el proceso de renovación:", error);
    }
  }

  /**
   * Verifica si un token necesita renovación
   */
  private tokenNeedsRenewal(token: any): boolean {
    if (!token) return true;

    const now = new Date();
    const expiration = new Date(token.expirationTime);
    const bufferMinutes = 30; // Renovar 30 minutos antes de expirar
    const bufferMs = bufferMinutes * 60 * 1000;

    return (expiration.getTime() - bufferMs) <= now.getTime();
  }

  /**
   * Registra la renovación del token en el log de auditoría
   */
  private async logTokenRenewal(
    tenantId: string, 
    status: "SUCCESS" | "FAILED", 
    error?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          entityType: "AfipToken",
          entityId: tenantId,
          action: "RENEW",
          newValues: {
            status,
            timestamp: new Date().toISOString(),
            error: error ? String(error) : undefined
          }
        }
      });
    } catch (logError) {
      console.error("Error registrando en audit log:", logError);
    }
  }

  /**
   * Notifica al administrador del tenant sobre fallos en la renovación
   */
  private async notifyTokenRenewalFailure(tenantId: string, error: any): Promise<void> {
    try {
      // Obtener administradores del tenant
      const admins = await prisma.user.findMany({
        where: { 
          tenantId, 
          role: "ADMIN", 
          active: true 
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (admins.length > 0) {
        // TODO: Implementar servicio de notificaciones
        // Aquí podrías enviar emails, SMS, o crear notificaciones en el sistema
        console.log(`📧 Notificación pendiente para ${admins.length} administradores del tenant ${tenantId}`);
        
        // Por ahora, solo logueamos. En producción, implementar:
        // - Servicio de email (SendGrid, AWS SES, etc.)
        // - Sistema de notificaciones in-app
        // - Webhooks para sistemas externos
        
        for (const admin of admins) {
          console.log(`  - ${admin.name} (${admin.email})`);
        }
      }
    } catch (notifyError) {
      console.error("Error enviando notificación:", notifyError);
    }
  }

  /**
   * Método para renovación manual de un tenant específico
   */
  async renewTokenForTenant(tenantId: string): Promise<boolean> {
    try {
      console.log(`🔄 Renovación manual solicitada para tenant ${tenantId}`);
      
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: {
          tenant: true,
          token: true
        }
      });

      if (!credential) {
        console.error(`❌ No se encontraron credenciales para tenant ${tenantId}`);
        return false;
      }

      const renewed = await this.wsaaService.getOrRenewToken(tenantId, true);
      
      if (renewed) {
        console.log(`✅ Token renovado exitosamente para tenant ${tenantId}`);
        await this.logTokenRenewal(tenantId, "SUCCESS");
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error en renovación manual para tenant ${tenantId}:`, error);
      await this.logTokenRenewal(tenantId, "FAILED", error);
      return false;
    }
  }

  /**
   * Obtiene el estado de los tokens de todos los tenants
   */
  async getTokensStatus(): Promise<any[]> {
    const credentials = await prisma.afipCredential.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            mode: true
          }
        },
        token: true
      }
    });

    return credentials.map(cred => {
      const now = new Date();
      const isValid = cred.token && new Date(cred.token.expirationTime) > now;
      const expiresIn = cred.token 
        ? Math.floor((new Date(cred.token.expirationTime).getTime() - now.getTime()) / 1000 / 60)
        : null;

      return {
        tenantId: cred.tenantId,
        tenantName: cred.tenant.name,
        mode: cred.tenant.mode,
        hasToken: !!cred.token,
        isValid,
        expiresIn: expiresIn ? `${expiresIn} minutos` : null,
        expirationTime: cred.token?.expirationTime,
        lastUpdate: cred.token?.updatedAt
      };
    });
  }
}

// Función para inicializar el cron job
export function initializeAfipTokenRenewal(): AfipTokenRenewalJob {
  const job = new AfipTokenRenewalJob();
  job.start();
  return job;
}