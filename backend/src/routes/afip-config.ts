// src/routes/afip-config.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { body, validationResult } from "express-validator";
import multer from "multer";
import type { AuthenticatedRequest } from "../types";
import { WsaaService } from "../services/arca/wsaa.service";
import { createWsfeClient, getLastVoucher, buildFeCAERequest, solicitarCAE } from "../services/arca/wsfe.service";

const router = Router();
const wsaaService = new WsaaService();

// Configuración de multer para archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Solo aceptar archivos .pem, .crt, .key
    const allowedExtensions = /\.(pem|crt|key)$/i;
    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos .pem, .crt o .key"));
    }
  }
});

/**
 * GET /api/afip/status
 * Obtiene el estado de configuración AFIP del tenant
 */
router.get(
  "/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { 
          token: true,
          tenant: {
            select: {
              id: true,
              name: true,
              cuit: true,
              mode: true
            }
          }
        }
      });

      if (!credential) {
        return res.json({
          configured: false,
          message: "No hay credenciales AFIP configuradas"
        });
      }

      const now = new Date();
      const tokenValid = credential.token && 
        new Date(credential.token.expirationTime) > now;

      const pointsOfSale = await prisma.afipPointOfSale.findMany({
        where: { tenantId, active: true },
        orderBy: { ptoVta: "asc" }
      });

      return res.json({
        configured: true,
        tenant: {
          name: credential.tenant.name,
          cuit: credential.tenant.cuit,
          mode: credential.tenant.mode
        },
        token: credential.token ? {
          valid: tokenValid,
          expiresAt: credential.token.expirationTime,
          expiresIn: tokenValid 
            ? `${Math.floor((new Date(credential.token.expirationTime).getTime() - now.getTime()) / 1000 / 60)} minutos`
            : "Expirado"
        } : null,
        pointsOfSale: pointsOfSale.length,
        service: credential.service
      });
    } catch (error) {
      console.error("Error obteniendo estado AFIP:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo estado" 
      });
    }
  }
);

/**
 * POST /api/afip/credentials
 * Carga o actualiza los certificados AFIP del tenant
 */
router.post(
  "/credentials",
  authenticateToken,
  requireAdmin,
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "privateKey", maxCount: 1 }
  ]),
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.certificate || !files.privateKey) {
      return res.status(400).json({
        success: false,
        error: "Se requieren ambos archivos: certificado y clave privada"
      });
    }

    try {
      const certPem = files.certificate[0].buffer.toString();
      const keyPem = files.privateKey[0].buffer.toString();

      if (!certPem.includes("BEGIN CERTIFICATE") || !keyPem.includes("BEGIN")) {
        return res.status(400).json({ 
          success: false, 
          error: "Los archivos no tienen el formato PEM correcto" 
        });
      }

      const credential = await prisma.afipCredential.upsert({
        where: { tenantId },
        create: {
          tenantId,
          certPem,
          keyPem,
          service: "wsfe"
        },
        update: {
          certPem,
          keyPem,
          updatedAt: new Date()
        }
      });

      // ... existing code ...
try {
  const token = await wsaaService.getOrRenewToken(tenantId, true);
  if (token) {
    return res.json({ 
      success: true, 
      message: "Credenciales actualizadas y validadas correctamente",
      tokenExpiry: token.expirationTime
    });
  }
} catch (tokenError) {
  return res.json({ 
    success: true, 
    warning: "Credenciales guardadas pero no se pudo validar con AFIP",
    error: String(tokenError)
  });
}
// Add this line to cover all code paths:
return res.status(500).json({ success: false, error: "No se pudo validar ni guardar el token" });

      // ⚠️ Aquí falta un return si no hay `token`
    } catch (error) {
      console.error("Error actualizando credenciales:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error actualizando credenciales" 
      });
    }
  }
);


/**
 * POST /api/afip/mode
 * Cambia el modo de operación (HOMOLOGACION/PRODUCCION)
 */
router.post(
  "/mode",
  authenticateToken,
  requireAdmin,
  body("mode").isIn(["HOMOLOGACION", "PRODUCCION"]),
  async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const tenantId = req.user!.tenantId;
    const { mode } = req.body;

    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { mode }
      });

      // Limpiar cache de token al cambiar de modo
      wsaaService.clearTokenCache(tenantId);

      return res.json({ 
        success: true, 
        message: `Modo cambiado a ${mode}`,
        tenant: {
          name: tenant.name,
          mode: tenant.mode
        }
      });
    } catch (error) {
      console.error("Error cambiando modo:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error cambiando modo" 
      });
    }
  }
);

/**
 * POST /api/afip/token/renew
 * Renueva manualmente el token de acceso
 */
router.post(
  "/token/renew",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const token = await wsaaService.getOrRenewToken(tenantId, true);
      
      if (token) {
        return res.json({
          success: true,
          message: "Token renovado exitosamente",
          expiresAt: token.expirationTime,
          expiresIn: `${Math.floor((new Date(token.expirationTime).getTime() - Date.now()) / 1000 / 60)} minutos`
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: "No se pudo renovar el token" 
      });
    } catch (error) {
      console.error("Error renovando token:", error);
      return res.status(500).json({ 
        success: false, 
        error: String(error) 
      });
    }
  }
);

/**
 * GET /api/afip/points-of-sale
 * Obtiene los puntos de venta del tenant
 */
router.get(
  "/points-of-sale",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const pointsOfSale = await prisma.afipPointOfSale.findMany({
        where: { tenantId },
        orderBy: { ptoVta: "asc" }
      });

      return res.json({
        success: true,
        pointsOfSale
      });
    } catch (error) {
      console.error("Error obteniendo puntos de venta:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo puntos de venta" 
      });
    }
  }
);

/**
 * POST /api/afip/points-of-sale/sync
 * Sincroniza los puntos de venta con AFIP
 */
router.post(
  "/points-of-sale/sync",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { token: true, tenant: true }
      });
      if (!credential || !credential.token || !credential.tenant) throw new Error('Credenciales AFIP no configuradas');
      const prod = credential.tenant.mode === 'PRODUCCION';
      const client = await createWsfeClient(prod);
      const [result] = await client.FEParamGetPtosVentaAsync({
        Auth: {
          Token: credential.token.token,
          Sign: credential.token.sign,
          Cuit: Number(credential.tenant.cuit)
        }
      });
      const puntosVentaAfip = result?.FEParamGetPtosVentaResult?.ResultGet || [];      
      if (!puntosVentaAfip || puntosVentaAfip.length === 0) {
        return res.json({
          success: false,
          message: "No se pudieron obtener puntos de venta de AFIP. Verifique las credenciales."
        });
      }

      const results = {
        found: puntosVentaAfip.length,
        created: 0,
        updated: 0
      };

      for (const pvAfip of puntosVentaAfip) {
        const exists = await prisma.afipPointOfSale.findUnique({
          where: { 
            tenantId_ptoVta: {
              tenantId,
              ptoVta: pvAfip.Nro
            }
          }
        });

        if (!exists) {
          await prisma.afipPointOfSale.create({
            data: {
              tenantId,
              ptoVta: pvAfip.Nro,
              description: `Punto de Venta ${pvAfip.Nro}`,
              active: pvAfip.Bloqueado === "N"
            }
          });
          results.created++;
        } else {
          await prisma.afipPointOfSale.update({
            where: { id: exists.id },
            data: {
              active: pvAfip.Bloqueado === "N",
              updatedAt: new Date()
            }
          });
          results.updated++;
        }
      }

      // Registrar en audit log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user!.id,
          entityType: "AfipPointOfSale",
          entityId: tenantId,
          action: "SYNC",
          newValues: results
        }
      });

      return res.json({
        success: true,
        message: "Puntos de venta sincronizados exitosamente",
        results
      });
    } catch (error) {
      console.error("Error sincronizando puntos de venta:", error);
      return res.status(500).json({ 
        success: false, 
        error: String(error) 
      });
    }
  }
);

/**
 * DELETE /api/afip/credentials
 * Elimina las credenciales AFIP del tenant
 */
router.delete(
  "/credentials",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      // Verificar que existen credenciales
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId }
      });

      if (!credential) {
        return res.status(404).json({ 
          success: false, 
          error: "No hay credenciales para eliminar" 
        });
      }

      // Eliminar en cascada (token se elimina automáticamente por la relación)
      await prisma.afipCredential.delete({
        where: { tenantId }
      });

      // Limpiar cache
      wsaaService.clearTokenCache(tenantId);

      // Registrar en audit log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user!.id,
          entityType: "AfipCredential",
          entityId: credential.id,
          action: "DELETE",
          oldValues: { id: credential.id }
        }
      });

      return res.json({ 
        success: true, 
        message: "Credenciales eliminadas correctamente" 
      });
    } catch (error) {
      console.error("Error eliminando credenciales:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error eliminando credenciales" 
      });
    }
  }
);

export default router;