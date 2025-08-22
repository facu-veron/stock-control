// src/routes/afip-test.ts
// IMPORTANTE: Solo usar en desarrollo/staging, NO en producción
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { WsaaService } from "../services/arca/wsaa.service";
import { createWsfeClient, getLastVoucher, buildFeCAERequest, solicitarCAE } from "../services/arca/wsfe.service";
import { AfipTokenRenewalJob } from "../jobs/afip-token-renewal.job";
import type { AuthenticatedRequest } from "../types";
import type { AfipCredential } from '@prisma/client';

const router = Router();
const wsaaService = new WsaaService();
const tokenJob = new AfipTokenRenewalJob();

// Middleware para verificar ambiente de desarrollo
const requireDevelopment = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ 
      success: false, 
      error: "Endpoints de testing no disponibles en producción" 
    });
  }
  next();
};

/**
 * GET /api/afip-test/status
 * Obtiene el estado general del sistema AFIP
 */
router.get(
  "/status",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      // Verificar credenciales
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { 
          token: true,
          tenant: true 
        }
      });

      if (!credential) {
        return res.json({
          success: false,
          status: {
            hasCredentials: false,
            message: "No hay credenciales AFIP configuradas"
          }
        });
      }

      // Verificar token
      const now = new Date();
      const tokenValid = credential.token && 
        new Date(credential.token.expirationTime) > now;

      const tokenInfo = credential.token ? {
        exists: true,
        valid: tokenValid,
        expiresAt: credential.token.expirationTime,
        expiresIn: tokenValid 
          ? Math.floor((new Date(credential.token.expirationTime).getTime() - now.getTime()) / 1000 / 60) + " minutos"
          : "Expirado",
        generatedAt: credential.token.generationTime
      } : {
        exists: false,
        valid: false
      };

      // Obtener puntos de venta
      const puntosVenta = await prisma.afipPointOfSale.findMany({
        where: { tenantId },
        orderBy: { ptoVta: "asc" }
      });

      return res.json({
        success: true,
        status: {
          hasCredentials: true,
          mode: credential.tenant.mode,
          service: credential.service,
          token: tokenInfo,
          pointsOfSale: puntosVenta.map(pv => ({
            numero: pv.ptoVta,
            descripcion: pv.description,
            activo: pv.active
          })),
          wsaaUrl: credential.tenant.mode === "PRODUCCION" 
            ? "https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL"
            : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL",
          wsfeUrl: credential.tenant.mode === "PRODUCCION"
            ? "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"
            : "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
        }
      });
    } catch (error) {
      console.error("Error obteniendo estado:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo estado del sistema AFIP" 
      });
    }
  }
);

/**
 * POST /api/afip-test/token/renew
 * Fuerza la renovación del token
 */
router.post(
  "/token/renew",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { forceRenew = true } = req.body;

    try {
      console.log(`🔄 Renovación manual de token solicitada para tenant ${tenantId}`);
      
      const token = await wsaaService.getOrRenewToken(tenantId, forceRenew);
      
      if (token) {
        return res.json({
          success: true,
          message: "Token renovado exitosamente",
          token: {
            generationTime: token.generationTime,
            expirationTime: token.expirationTime,
            expiresIn: Math.floor(
              (new Date(token.expirationTime).getTime() - Date.now()) / 1000 / 60
            ) + " minutos"
          }
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
        error: error instanceof Error ? error.message : "Error renovando token" 
      });
    }
  }
);

/**
 * POST /api/afip-test/token/clear-cache
 * Limpia el cache de tokens
 */
router.post(
  "/token/clear-cache",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      wsaaService.clearTokenCache(tenantId);
      
      return res.json({
        success: true,
        message: "Cache de token limpiado"
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        error: "Error limpiando cache" 
      });
    }
  }
);

/**
 * GET /api/afip-test/token/all-status
 * Obtiene el estado de tokens de todos los tenants (super admin)
 */
router.get(
  "/token/all-status",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    try {
      const tokensStatus = await tokenJob.getTokensStatus();
      
      return res.json({
        success: true,
        tenants: tokensStatus
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo estado de tokens" 
      });
    }
  }
);

// Helpers para AFIP WSFE
async function obtenerPuntosVentaAFIP(tenantId: string) {
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

async function procesarFacturacionAFIP({ tenantId, sale, tipoFactura, puntoVenta }: { tenantId: string, sale: any, tipoFactura: string, puntoVenta: number }) {
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

/**
 * POST /api/afip-test/sync-points-of-sale
 * Sincroniza puntos de venta con AFIP
 */
router.post(
  "/sync-points-of-sale",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;
    try {
      const puntosVentaAfip = await obtenerPuntosVentaAFIP(tenantId);
      if (!puntosVentaAfip || puntosVentaAfip.length === 0) {
        return res.json({
          success: false,
          message: "No se pudieron obtener puntos de venta de AFIP"
        });
      }
      const syncResults = { found: puntosVentaAfip.length, created: 0, updated: 0 };
      for (const pvAfip of puntosVentaAfip) {
        const exists = await prisma.afipPointOfSale.findUnique({
          where: { tenantId_ptoVta: { tenantId, ptoVta: pvAfip.Nro } }
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
          syncResults.created++;
        } else {
          await prisma.afipPointOfSale.update({
            where: { id: exists.id },
            data: { active: pvAfip.Bloqueado === "N" }
          });
          syncResults.updated++;
        }
      }
      return res.json({
        success: true,
        message: "Puntos de venta sincronizados",
        results: syncResults,
        pointsOfSale: puntosVentaAfip.map((pv: any) => ({ numero: pv.Nro, bloqueado: pv.Bloqueado === "S" }))
      });
    } catch (error) {
      console.error("Error sincronizando puntos de venta:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Error sincronizando" });
    }
  }
);

/**
 * POST /api/afip-test/create-test-sale
 * Crea una venta de prueba con facturación
 */
router.post(
  "/create-test-sale",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;
    const { tipoFactura = "FACTURA_B", puntoVenta = 1, monto = 100.00 } = req.body;
    try {
      const product = await prisma.product.findFirst({ where: { tenantId } });
      if (!product) {
        return res.status(400).json({ success: false, error: "No hay productos en el sistema. Crea uno primero." });
      }
      const sale = await prisma.sale.create({
        data: {
          tenantId,
          employeeId: req.user!.id,
          saleNumber: `TEST-${Date.now()}`,
          subtotal: monto,
          taxTotal: monto * 0.21,
          grandTotal: monto * 1.21,
          status: "DRAFT",
          paymentStatus: "PENDING",
          ptoVta: puntoVenta,
          cbteTipo: 0,
          items: {
            create: {
              tenantId,
              productId: product.id,
              productName: product.name,
              unitPrice: monto,
              quantity: 1,
              lineTotal: monto,
              ivaRate: 21
            }
          }
        },
        include: { items: true }
      });
      // Obtener el último comprobante autorizado
      // (esto requiere una llamada a getLastVoucher, pero aquí lo dejamos fijo en 1 para ejemplo)
      const factura = await procesarFacturacionAFIP({ tenantId, sale, tipoFactura, puntoVenta });
      if (factura) {
        const updatedSale = await prisma.sale.findUnique({ where: { id: sale.id }, include: { items: true } });
        return res.json({
          success: true,
          message: "Venta de prueba creada y facturada",
          sale: updatedSale,
          factura: {
            cae: factura.CAE,
            vencimiento: factura.CAEFchVto,
            resultado: factura.Resultado,
            observaciones: factura.Observaciones,
            errores: factura.Errores
          }
        });
      }
      return res.json({ success: false, message: "Venta creada pero no se pudo facturar", sale });
    } catch (error) {
      console.error("Error creando venta de prueba:", error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Error creando venta de prueba" });
    }
  }
);

/**
 * DELETE /api/afip-test/cleanup-test-sales
 * Limpia las ventas de prueba
 */
router.delete(
  "/cleanup-test-sales",
  authenticateToken,
  requireAdmin,
  requireDevelopment,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const result = await prisma.sale.deleteMany({
        where: {
          tenantId,
          saleNumber: {
            startsWith: "TEST-"
          }
        }
      });

      return res.json({
        success: true,
        message: `${result.count} ventas de prueba eliminadas`
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        error: "Error limpiando ventas de prueba" 
      });
    }
  }
);

export default router;