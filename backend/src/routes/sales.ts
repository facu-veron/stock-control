// src/routes/sales.ts
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { body, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import { afipService } from "../services/afip.service";
import bcrypt from 'bcryptjs';
import { 
  type InvoiceTypeUI,
  validateInvoiceTypeForCustomer,
  validateDocumentTypeForTaxCondition,
  convertInvoiceTypeUIToAfip
} from "../types/afip-types";

const router = Router();

/**
 * GET /api/sales
 * Obtiene el historial de ventas con paginación
 */
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const offset = (page - 1) * limit;

    // Construir filtros de fecha
    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Incluir todo el día
        dateFilter.lte = endDateTime;
      }
    }

    const whereClause = {
      tenantId,
      ...(startDate || endDate ? { createdAt: dateFilter } : {})
    };

    // Obtener ventas con paginación
    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              documentType: true,
              documentNumber: true,
              taxStatus: true,
            }
          },
          employee: {
            select: {
              id: true,
              name: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset,
      }),
      prisma.sale.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.error("❌ Error obteniendo ventas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor al obtener ventas"
    });
  }
});

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
    body("invoiceType").isIn(["TICKET", "FACTURA_A", "FACTURA_B", "FACTURA_C"]),
    body("puntoVenta").optional().isInt({ min: 1 }),
    body("customer").optional().isObject(),
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
    const { 
      employeeId, 
      customerId, 
      items, 
      invoiceType = "TICKET",
      puntoVenta,
      notes,
      customer: customerData
    } = req.body;

    // ✅ VALIDACIONES SIMPLIFICADAS
    if (invoiceType !== "TICKET") {
      if (!puntoVenta || puntoVenta < 1) {
        return res.status(400).json({ 
          success: false, 
          error: "Punto de venta es requerido para facturas electrónicas" 
        });
      }

      // Validar compatibilidad si hay datos de cliente
      if (customerData) {
        const docValidation = validateDocumentTypeForTaxCondition(
          customerData.documentType, 
          customerData.taxStatus
        );
        if (!docValidation.valid) {
          return res.status(400).json({ 
            success: false, 
            error: docValidation.error 
          });
        }

        const invoiceValidation = validateInvoiceTypeForCustomer(
          invoiceType as InvoiceTypeUI, 
          customerData.taxStatus
        );
        if (!invoiceValidation.valid) {
          return res.status(400).json({ 
            success: false, 
            error: invoiceValidation.error 
          });
        }
      }
    }

    try {
      // Verificar empleado
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

      // Crear la venta
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
          }
        }

        const grandTotal = subtotal + taxTotal;

        // ✅ Determinar cbteTipo dinámicamente según el invoiceType
        let cbteTipo = 0; // Por defecto para tickets
        if (invoiceType !== "TICKET") {
          try {
            cbteTipo = convertInvoiceTypeUIToAfip(invoiceType as InvoiceTypeUI);
          } catch {
            cbteTipo = 1; // Fallback a FACTURA_A por compatibilidad
          }
        }

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
            cbteTipo, // ✅ Ahora dinámico
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
              select: { id: true, name: true, email: true }
            }
          }
        });

        return newSale;
      });

      // ✅ PROCESAR FACTURACIÓN CON AFIP (corregido para usar determinación automática)
      if (invoiceType !== "TICKET" && puntoVenta) {
        try {
          // 🔄 CORRECCIÓN: Determinar automáticamente el tipo correcto basado en el cliente
          const correctInvoiceType = customerData ? 
            determineInvoiceTypeFromCustomer(customerData.taxStatus) : 
            invoiceType as InvoiceTypeUI;

          console.log(`🔄 Tipo original: ${invoiceType}, Tipo corregido: ${correctInvoiceType}`);

          const afipResponse = await afipService.procesarFacturacionFromSale({
            tenantId,
            sale: createdSale,
            tipoFactura: correctInvoiceType, // ✅ Usar el tipo corregido automáticamente
            puntoVenta,
            customer: customerData
          });

          // Obtener venta actualizada
          const updatedSale = await prisma.sale.findUnique({
            where: { id: createdSale.id },
            include: {
              items: { include: { product: true } },
              customer: true,
              employee: { select: { id: true, name: true, email: true } }
            }
          });

          return res.json({
            success: true,
            message: "Venta creada y factura electrónica generada",
            sale: updatedSale,
            afip: afipResponse
          });

        } catch (afipError) {
          console.error("❌ Error con AFIP:", afipError);
          
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
 * GET /api/sales/afip/voucher-types
 * Obtiene los tipos de comprobante desde AFIP
 */
router.get(
  "/afip/voucher-types",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const voucherTypes = await afipService.getVoucherTypes(tenantId);
      return res.json({
        success: true,
        voucherTypes
      });
    } catch (error) {
      console.error("❌ Error obteniendo tipos de comprobante:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo tipos de comprobante desde AFIP" 
      });
    }
  }
);

/**
 * GET /api/sales/afip/document-types
 * Obtiene los tipos de documento desde AFIP
 */
router.get(
  "/afip/document-types", 
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const documentTypes = await afipService.getDocumentTypes(tenantId);
      return res.json({
        success: true,
        documentTypes
      });
    } catch (error) {
      console.error("❌ Error obteniendo tipos de documento:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo tipos de documento desde AFIP" 
      });
    }
  }
);

/**
 * GET /api/sales/afip/aliquot-types
 * Obtiene las alícuotas de IVA desde AFIP
 */
router.get(
  "/afip/aliquot-types",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const aliquotTypes = await afipService.getAliquotTypes(tenantId);
      return res.json({
        success: true,
        aliquotTypes
      });
    } catch (error) {
      console.error("❌ Error obteniendo alícuotas de IVA:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo alícuotas de IVA desde AFIP" 
      });
    }
  }
);

/**
 * GET /api/sales/afip/currency-types
 * Obtiene los tipos de moneda desde AFIP
 */
router.get(
  "/afip/currency-types",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const currencyTypes = await afipService.getCurrencyTypes(tenantId);
      return res.json({
        success: true,
        currencyTypes
      });
    } catch (error) {
      console.error("❌ Error obteniendo tipos de moneda:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo tipos de moneda desde AFIP" 
      });
    }
  }
);

/**
 * GET /api/sales/afip/server-status
 * Verifica el estado del servidor de AFIP
 */
router.get(
  "/afip/server-status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user!.tenantId;

    try {
      const serverStatus = await afipService.getServerStatus(tenantId);
      return res.json({
        success: true,
        serverStatus
      });
    } catch (error) {
      console.error("❌ Error obteniendo estado del servidor:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo estado del servidor AFIP" 
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
      const pointsOfSale = await afipService.getPointsOfSale(tenantId);
      
      return res.json({
        success: true,
        pointsOfSale
      });
    } catch (error) {
      console.error("❌ Error obteniendo puntos de venta:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error obteniendo puntos de venta desde AFIP" 
      });
    }
  }
);

/**
 * POST /api/sales/determine-invoice-type
 * Determina automáticamente el tipo de factura según el cliente
 */
router.post(
  "/determine-invoice-type",
  authenticateToken,
  body("customer").isObject(),
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: "Datos del cliente inválidos", 
        details: errors.array() 
      });
    }

    const { customer } = req.body;

    try {
      // Determinar tipo de factura usando la lógica AFIP
      const invoiceType = determineInvoiceTypeFromCustomer(customer.taxStatus);
      
      // Validar la combinación
      const validation = validateInvoiceTypeForCustomer(invoiceType, customer.taxStatus);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      return res.json({
        success: true,
        invoiceType,
        customer: {
          taxStatus: customer.taxStatus,
          documentType: customer.documentType
        },
        afipRules: {
          emisor: "RESPONSABLE_INSCRIPTO",
          receptor: customer.taxStatus,
          resultado: invoiceType
        }
      });

    } catch (error) {
      console.error("❌ Error determinando tipo de factura:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Error interno del servidor" 
      });
    }
  }
);

/**
 * Helper function para determinar tipo de factura
 * REGLAS AFIP: Responsable Inscripto (EMISOR) puede emitir:
 * - FACTURA_A (código 1) → a Responsables Inscriptos  
 * - FACTURA_B (código 6) → a Consumidor Final, Monotributo, Exento, No Categorizado
 * - NO puede emitir FACTURA_C (eso es solo para Monotributo EMISOR)
 */
function determineInvoiceTypeFromCustomer(customerTaxStatus: string): InvoiceTypeUI {
  switch (customerTaxStatus) {
    case 'RESPONSABLE_INSCRIPTO':
      return 'FACTURA_A'; // RI → RI = FACTURA_A
    case 'MONOTRIBUTO':
      return 'FACTURA_B'; // RI → Monotributo = FACTURA_B
    case 'EXENTO':
      return 'FACTURA_B'; // RI → Exento = FACTURA_B
    case 'CONSUMIDOR_FINAL':
      return 'FACTURA_B'; // RI → Consumidor Final = FACTURA_B (CORREGIDO)
    default:
      return 'FACTURA_B'; // RI → Otros = FACTURA_B (CORREGIDO)
  }
}

export default router;