// src/routes/sales.ts
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { body, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import bcrypt from "bcryptjs";
import { afipService } from "../services/afip.service";


const router = Router();

/**
 * POST /api/sales/validate-pin
 * Valida el PIN de un empleado para autorizar la venta
 */
router.post(
  "/validate-pin",
  authenticateToken,
  body("pin").isString().notEmpty(),
  async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: "PIN inválido", 
        details: errors.array() 
      });
    }

    const tenantId = req.user!.tenantId;
    const { pin } = req.body as { pin: string };

    try {
      // Buscar empleados del tenant con pinHash
      const employees = await prisma.user.findMany({
        where: { 
          tenantId, 
          active: true, 
          role: "EMPLOYEE", 
          NOT: { pinHash: null } 
        },
        select: { id: true, pinHash: true, name: true },
        take: 500, // Bound de seguridad
      });

      for (const u of employees) {
        if (u.pinHash && await bcrypt.compare(String(pin), u.pinHash)) {
          await prisma.user.update({ 
            where: { id: u.id }, 
            data: { pinLastUsedAt: new Date() } 
          });
          
          return res.json({ 
            success: true, 
            message: "PIN válido", 
            userId: u.id,
            userName: u.name 
          });
        }
      }

      return res.status(401).json({ 
        success: false, 
        error: "PIN incorrecto o usuario no autorizado" 
      });
    } catch (error) {
      console.error("❌ Error validando el PIN:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error interno del servidor" 
      });
    }
  }
);

/**
 * POST /api/sales/create
 * Crea una nueva venta con facturación electrónica opcional
 */
router.post(
  "/create",
  authenticateToken,
  [
    body("employeeId").isString().notEmpty(),
    body("customerId").optional().isString(),
    body("items").isArray().notEmpty(),
    body("items.*.productId").isString().notEmpty(),
    body("items.*.quantity").isInt({ min: 1 }),
    body("items.*.unitPrice").isFloat({ min: 0 }),
    body("invoiceType").optional().isIn(["TICKET", "FACTURA_A", "FACTURA_B", "FACTURA_C"]),
    body("puntoVenta").optional().isInt({ min: 1 })
  ],
  async (req: AuthenticatedRequest, res:Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: "Datos inválidos", 
        details: errors.array() 
      });
    }

    const tenantId = req.user!.tenantId;
    const { 
      employeeId, 
      customerId, 
      items, 
      invoiceType = "TICKET",
      puntoVenta,
      notes 
    } = req.body;

    try {
      // Verificar que el empleado pertenece al tenant
      const employee = await prisma.user.findFirst({
        where: { id: employeeId, tenantId, active: true }
      });

      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          error: "Empleado no encontrado" 
        });
      }

      // Verificar cliente si se proporciona
      let customer = null;
      if (customerId) {
        customer = await prisma.customer.findFirst({
          where: { id: customerId, tenantId }
        });
        
        if (!customer) {
          return res.status(404).json({ 
            success: false, 
            error: "Cliente no encontrado" 
          });
        }
      }

      // Crear la venta en una transacción
      const createdSale = await prisma.$transaction(async (tx) => {
        // Generar número de venta
        const lastSale = await tx.sale.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          select: { saleNumber: true }
        });

        const nextNumber = lastSale?.saleNumber 
          ? (parseInt(lastSale.saleNumber) + 1).toString().padStart(8, "0")
          : "00000001";

        // Calcular totales
        let subtotal = 0;
        let taxTotal = 0;
        const saleItems = [];

        for (const item of items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId }
          });

          if (!product) {
            throw new Error(`Producto ${item.productId} no encontrado`);
          }

          // Verificar stock si se rastrea inventario
          if (product.trackInventory && product.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${product.name}`);
          }

          const lineTotal = item.quantity * item.unitPrice;
          const ivaRate = Number(product.ivaRate || 21);
          const lineTax = lineTotal * (ivaRate / 100);

          subtotal += lineTotal;
          taxTotal += lineTax;

          saleItems.push({
            tenantId,
            productId: product.id,
            productName: product.name,
            skuSnapshot: product.sku,
            unitPrice: item.unitPrice,
            unitCost: product.cost || 0,
            quantity: item.quantity,
            discount: item.discount || 0,
            ivaRate,
            lineTotal
          });

          // Actualizar stock
          if (product.trackInventory) {
            await tx.product.update({
              where: { id: product.id },
              data: { stock: { decrement: item.quantity } }
            });

            // Registrar movimiento de stock
            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: product.id,
                userId: employeeId,
                type: "SALE",
                quantity: -item.quantity,
                stockBefore: product.stock,
                stockAfter: product.stock - item.quantity,
                reference: nextNumber,
                reason: "Venta"
              }
            });
          }
        }

        const grandTotal = subtotal + taxTotal;

        // Crear la venta
        const newSale = await tx.sale.create({
          data: {
            tenantId,
            employeeId,
            customerId,
            saleNumber: nextNumber,
            subtotal,
            taxTotal,
            grandTotal,
            status: invoiceType === "TICKET" ? "CONFIRMED" : "DRAFT",
            paymentStatus: "PENDING",
            ptoVta: puntoVenta || 0,
            cbteTipo: 0, // Se actualizará con AFIP
            notes,
            items: {
              create: saleItems
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            employee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        return newSale;
      });

      // Si es factura electrónica, procesarla con AFIP
      if (invoiceType !== "TICKET" && puntoVenta) {
        try {
          const comprobanteRespuesta = await afipService.procesarFacturacionFromSale({
            tenantId,
            sale: createdSale,
            tipoFactura: invoiceType as any,
            puntoVenta,
            customer: req.body.customer // Pasar customer inline si viene en el body
          });

          if (comprobanteRespuesta) {
            // Obtener la venta actualizada con datos de AFIP
            const updatedSale = await prisma.sale.findUnique({
              where: { id: createdSale.id },
              include: {
                items: {
                  include: {
                    product: true
                  }
                },
                customer: true,
                employee: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            });

            return res.json({
              success: true,
              message: "Venta creada y factura electrónica generada",
              sale: updatedSale,
              afip: {
                cae: comprobanteRespuesta.cae,
                vencimiento: comprobanteRespuesta.caeFchVto,
                numero: comprobanteRespuesta.cbteNumero
              }
            });
          }
        } catch (afipError) {
          console.error("❌ Error con AFIP, venta guardada como borrador:", afipError);
          
          // La venta ya está creada, solo informar del error con AFIP
          return res.json({
            success: true,
            warning: "Venta creada pero hubo un error con AFIP",
            sale: createdSale,
            afipError: String(afipError)
          });
        }
      }

      return res.json({
        success: true,
        message: "Venta creada exitosamente",
        sale: createdSale
      });

    } catch (error) {
      console.error("❌ Error creando venta:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      });
    }
  }
);

/**
 * GET /api/sales/points-of-sale
 * Obtiene los puntos de venta habilitados en AFIP
 */
router.get(
  "/points-of-sale",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      // Obtener puntos de venta desde AFIP
      const puntosVentaAfip = await afipService.getPointsOfSale(tenantId);
      
      // Obtener puntos de venta guardados en BD
      const puntosVentaLocal = await prisma.afipPointOfSale.findMany({
        where: { tenantId, active: true },
        orderBy: { ptoVta: "asc" }
      });

      // Sincronizar con AFIP si es necesario
      for (const pvAfip of puntosVentaAfip) {
        const exists = puntosVentaLocal.find(pv => pv.ptoVta === pvAfip.Nro);
        if (!exists) {
          await prisma.afipPointOfSale.create({
            data: {
              tenantId,
              ptoVta: pvAfip.Nro,
              description: `Punto de Venta ${pvAfip.Nro}`,
              active: pvAfip.Bloqueado === "N"
            }
          });
        }
      }

      // Obtener lista actualizada
      const puntosVenta = await prisma.afipPointOfSale.findMany({
        where: { tenantId, active: true },
        orderBy: { ptoVta: "asc" }
      });

      return res.json({
        success: true,
        pointsOfSale: puntosVenta
      });
    } catch (error) {
      console.error("❌ Error obteniendo puntos de venta:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo puntos de venta" 
      });
    }
  }
);

/**
 * POST /api/sales/:id/retry-invoice
 * Reintenta generar la factura electrónica para una venta
 */
router.post(
  "/:id/retry-invoice",
  authenticateToken,
  [
    body("invoiceType").isIn(["FACTURA_A", "FACTURA_B", "FACTURA_C"]),
    body("puntoVenta").isInt({ min: 1 })
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { invoiceType, puntoVenta } = req.body;
    const tenantId = req.user!.tenantId;

    try {
      // Verificar que la venta existe y pertenece al tenant
      const sale = await prisma.sale.findFirst({
        where: { 
          id, 
          tenantId,
          cae: null // Solo reintentar si no tiene CAE
        }
      });

      if (!sale) {
        return res.status(404).json({ 
          success: false, 
          error: "Venta no encontrada o ya tiene factura" 
        });
      }

      // Procesar facturación
      const comprobanteRespuesta = await afipService.procesarFacturacionFromSale({
        tenantId,
        sale,
        tipoFactura: invoiceType,
        puntoVenta
      });

      if (comprobanteRespuesta) {
        const updatedSale = await prisma.sale.findUnique({
          where: { id: sale.id },
          include: {
            items: true,
            customer: true
          }
        });

        return res.json({
          success: true,
          message: "Factura electrónica generada exitosamente",
          sale: updatedSale,
          afip: {
            cae: comprobanteRespuesta.cae,
            vencimiento: comprobanteRespuesta.caeFchVto
          }
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: "No se pudo generar la factura electrónica" 
      });

    } catch (error) {
      console.error("❌ Error reintentando factura:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      });
    }
  }
);

export default router;