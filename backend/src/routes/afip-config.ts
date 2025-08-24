// src/routes/afip-config.ts
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { body, validationResult } from "express-validator";
import multer from "multer";
import type { AuthenticatedRequest } from "../types";
import { afipService } from "../services/afip.service";

const router = Router();

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

      return res.json({ 
        success: true, 
        message: "Credenciales actualizadas correctamente"
      });

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

      // afip.ts maneja automáticamente los tokens

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
      // afip.ts maneja automáticamente los tokens
      return res.json({
        success: true,
        message: "Los tokens AFIP se manejan automáticamente con afip.ts"
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
 * POST /api/afip/points-of-sale
 * Crea un punto de venta manualmente
 */
router.post(
  "/points-of-sale",
  authenticateToken,
  requireAdmin,
  [
    body("ptoVta").isInt({ min: 1 }).withMessage("Punto de venta debe ser un número mayor a 0"),
    body("description").optional().isString().withMessage("Descripción debe ser texto"),
    body("active").optional().isBoolean().withMessage("Active debe ser verdadero o falso")
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Datos inválidos",
        details: errors.array()
      });
    }

    const tenantId = req.user!.tenantId;
    const { ptoVta, description, active = true } = req.body;

    try {
      // Verificar que no exista ya
      const existing = await prisma.afipPointOfSale.findUnique({
        where: {
          tenantId_ptoVta: {
            tenantId,
            ptoVta
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: `El punto de venta ${ptoVta} ya existe`
        });
      }

      // Crear punto de venta
      const pointOfSale = await prisma.afipPointOfSale.create({
        data: {
          tenantId,
          ptoVta,
          description: description || `Punto de Venta ${ptoVta}`,
          active
        }
      });

      // Registrar en audit log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user!.id,
          entityType: "AfipPointOfSale",
          entityId: pointOfSale.id,
          action: "CREATE",
          newValues: pointOfSale
        }
      });

      return res.json({
        success: true,
        message: "Punto de venta creado exitosamente",
        pointOfSale
      });
    } catch (error) {
      console.error("Error creando punto de venta:", error);
      return res.status(500).json({
        success: false,
        error: "Error interno del servidor"
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
      if (!credential || !credential.tenant) throw new Error('Credenciales AFIP no configuradas');
      
      // Usar afip.ts para obtener puntos de venta
      const puntosVentaAfip = await afipService.getPointsOfSale(tenantId);      
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

      // afip.ts maneja automáticamente los tokens

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