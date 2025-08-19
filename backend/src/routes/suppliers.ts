import { Router, type Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireRole } from "../middleware/auth";
import type { AuthenticatedRequest, ApiResponse } from "../types";

const router = Router();

const validateSupplier = [
  body("name").trim().notEmpty().withMessage("El nombre es requerido"),
  body("contact").optional().trim().isLength({ max: 100 }).withMessage("El contacto no puede exceder los 100 caracteres"),
  body("email").optional().isEmail().withMessage("Debe ser un email válido"),
  body("phone").optional().isLength({ min: 6, max: 20 }).withMessage("El teléfono debe tener entre 6 y 20 caracteres"),
];

// GET /api/suppliers
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: suppliers, count: suppliers.length } as ApiResponse);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// GET /api/suppliers/:id
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) return res.status(404).json({ success: false, error: "Proveedor no encontrado" } as ApiResponse);

    return res.json({ success: true, data: supplier } as ApiResponse);
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// POST /api/suppliers
router.post("/", authenticateToken, requireRole(["ADMIN"]), validateSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "Datos inválidos", details: errors.array() } as ApiResponse);
    }

    const tenantId = req.user!.tenantId;
    const { name, contact, email, phone } = req.body as { name: string; contact?: string; email?: string; phone?: string };

    const supplier = await prisma.supplier.create({ data: { tenantId, name, contact, email, phone } });

    return res.status(201).json({ success: true, message: "Proveedor creado exitosamente", data: supplier } as ApiResponse);
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// PUT /api/suppliers/:id
router.put("/:id", authenticateToken, requireRole(["ADMIN"]), validateSupplier, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "Datos inválidos", details: errors.array() } as ApiResponse);
    }

    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, contact, email, phone } = req.body as { name: string; contact?: string; email?: string; phone?: string };

    const updated = await prisma.supplier.updateMany({ where: { id, tenantId }, data: { name, contact, email, phone } });
    if (updated.count === 0) {
      return res.status(404).json({ success: false, error: "Proveedor no encontrado" });
    }

    const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } });
    return res.json({ success: true, message: "Proveedor actualizado exitosamente", data: supplier } as ApiResponse);
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const productsCount = await prisma.product.count({ where: { supplierId: id, tenantId } });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: "No se puede eliminar el proveedor",
        message: `Tiene ${productsCount} producto(s) asociado(s)`,
      } as ApiResponse);
    }

    const deleted = await prisma.supplier.deleteMany({ where: { id, tenantId } });
    if (deleted.count === 0) return res.status(404).json({ success: false, error: "Proveedor no encontrado" });

    return res.json({ success: true, message: "Proveedor eliminado exitosamente" } as ApiResponse);
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

export default router;
