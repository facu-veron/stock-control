// routes/products.ts
import { Router, type Response } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth";
import type { AuthenticatedRequest, ApiResponse } from "../types";

const router = Router();

// ---- Tipos con relaciones
const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    category: { select: { id: true, name: true, color: true } },
    supplier: { select: { id: true, name: true, contact: true, email: true, phone: true } },
    productTags: { include: { tag: { select: { id: true, name: true } } } },
  },
});
type ProductWithRelations = Prisma.ProductGetPayload<typeof productWithRelations>;

// ---- Helper de normalización
function normalizeProduct(p: ProductWithRelations) {
  const { productTags, ...rest } = p;
  return {
    ...rest,
    tags: productTags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name })),
  };
}

// ---- Validaciones
const validateProduct = [
  body("name").trim().isLength({ min: 2, max: 200 }).withMessage("El nombre debe tener entre 2 y 200 caracteres"),
  body("description").optional().trim().isLength({ max: 1000 }).withMessage("La descripción no puede exceder 1000 caracteres"),
  body("sku").optional().trim().isLength({ max: 50 }).withMessage("El SKU no puede exceder 50 caracteres"),
  body("barcode").optional().trim().isLength({ max: 50 }).withMessage("El código de barras no puede exceder 50 caracteres"),
  body("price").isFloat({ min: 0 }).withMessage("El precio debe ser un número positivo"),
  body("cost").optional().isFloat({ min: 0 }).withMessage("El costo debe ser un número positivo"),
  body("stock").optional().isInt({ min: 0 }).withMessage("El stock debe ser un número entero positivo"),
  body("minStock").optional().isInt({ min: 0 }).withMessage("El stock mínimo debe ser un número entero positivo"),
  body("maxStock").optional().isInt({ min: 0 }).withMessage("El stock máximo debe ser un número entero positivo"),
  body("unit").optional().trim().isLength({ max: 20 }).withMessage("La unidad no puede exceder 20 caracteres"),
  body("categoryId").notEmpty().isString().withMessage("ID de categoría inválido"),
  body("supplierId").optional().isString().withMessage("ID de proveedor inválido"),
  body("brand").optional().trim().isLength({ max: 100 }).withMessage("La marca no puede exceder 100 caracteres"),
  body("color").optional().trim().isLength({ max: 50 }).withMessage("El color no puede exceder 50 caracteres"),
  body("size").optional().trim().isLength({ max: 50 }).withMessage("El tamaño no puede exceder 50 caracteres"),
  body("material").optional().trim().isLength({ max: 100 }).withMessage("El material no puede exceder 100 caracteres"),
  body("ivaRate").optional().isFloat({ min: 0, max: 100 }).withMessage("La tasa de IVA debe estar entre 0 y 100"),
  body("active").optional().isBoolean().withMessage("El estado activo debe ser verdadero o falso"),
  body("tags").optional().isArray().withMessage("Las etiquetas deben ser un array"),
  body("tags.*").optional().isString().withMessage("Cada etiqueta debe ser un string"),
];

// ---- Helper: upsert tags y devolver conexiones
async function upsertTagsAndConnect(tenantId: string, tagNames: string[] = []) {
  const connections: { id: string }[] = [];
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
      select: { id: true },
    });
    connections.push({ id: tag.id });
  }
  return connections;
}

// GET /api/products
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      page = "1", limit = "50", search = "", category = "", supplier = "",
      brand = "", active = "", sortBy = "name", sortOrder = "asc",
      lowStock = "false", tags = "",
    } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: Prisma.ProductWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) where.categoryId = category;
    if (supplier) where.supplierId = supplier;
    if (brand) where.brand = { contains: brand, mode: "insensitive" };
    if (active !== "") where.active = active === "true";

    if (lowStock === "true") {
    const currentAnd: Prisma.ProductWhereInput[] =
      Array.isArray(where.AND) ? where.AND
      : where.AND ? [where.AND]
      : [];

    currentAnd.push({ stock: { lte: prisma.product.fields.minStock } }); // FieldRef (Prisma 5)
    where.AND = currentAnd;
  }

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagArray.length) {
        where.productTags = {
          some: {
            tenantId,
            tag: { name: { in: tagArray } },
          },
        };
      }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      // whitelisting simple para evitar sort arbitrario
      [(["name","price","stock","createdAt","updatedAt","brand"].includes(sortBy) ? sortBy : "name")]:
        (sortOrder === "desc" ? "desc" : "asc"),
    } as any;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        ...productWithRelations,
        orderBy, skip, take,
      }),
      prisma.product.count({ where }),
    ]);

    const normalized = products.map(normalizeProduct);

    return res.json({
      success: true,
      data: normalized,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    } as ApiResponse);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// GET /api/products/:id
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      ...productWithRelations,
    });

    if (!product) {
      return res.status(404).json({ success: false, error: "Producto no encontrado" } as ApiResponse);
    }

    return res.json({ success: true, data: normalizeProduct(product) } as ApiResponse);
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// POST /api/products
router.post("/", authenticateToken, requireRole(["ADMIN"]), validateProduct, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "Datos de entrada inválidos", details: errors.array() } as ApiResponse);
    }

    const tenantId = req.user!.tenantId;
    const {
      name, description, sku, barcode, price, cost = 0, stock = 0, minStock = 0, maxStock,
      unit = "unidad", categoryId, supplierId, image, brand, color, size, material,
      ivaRate, active = true, tags = [],
    } = req.body as any;

    const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) return res.status(400).json({ success: false, error: "Categoría no encontrada" } as ApiResponse);

    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
      if (!supplier) return res.status(400).json({ success: false, error: "Proveedor no encontrado" } as ApiResponse);
    }

    const tagConnections = await upsertTagsAndConnect(tenantId, tags);

    const product = await prisma.product.create({
      data: {
        tenantId, name, description, sku, barcode,
        price, cost, stock, minStock, maxStock, unit,
        categoryId, supplierId, image, brand, color, size, material, ivaRate, active,
        productTags: {
          create: tagConnections.map((t) => ({ tenantId, tagId: t.id })),
        },
      },
      ...productWithRelations,
    });

    return res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      data: normalizeProduct(product),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creando producto:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// PUT /api/products/:id
router.put("/:id", authenticateToken, requireRole(["ADMIN"]), validateProduct, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "Datos de entrada inválidos", details: errors.array() } as ApiResponse);
    }

    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      name, description, sku, barcode, price, cost, stock, minStock, maxStock, unit,
      categoryId, supplierId, image, brand, color, size, material, ivaRate, active, tags = [],
    } = req.body as any;

    const exists = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) return res.status(404).json({ success: false, error: "Producto no encontrado" } as ApiResponse);

    const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) return res.status(400).json({ success: false, error: "Categoría no encontrada" } as ApiResponse);

    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
      if (!supplier) return res.status(400).json({ success: false, error: "Proveedor no encontrado" } as ApiResponse);
    }

    const tagConnections = await upsertTagsAndConnect(tenantId, tags);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name, description, sku, barcode, price, cost, stock, minStock, maxStock, unit,
          categoryId, supplierId, image, brand, color, size, material, ivaRate, active,
        },
      });

      await tx.productTag.deleteMany({ where: { productId: id, tenantId } });

      if (tagConnections.length > 0) {
        await tx.productTag.createMany({
          data: tagConnections.map((t) => ({ productId: id, tagId: t.id, tenantId })),
          skipDuplicates: true,
        });
      }
    });

    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      ...productWithRelations,
    });

    return res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: normalizeProduct(product as ProductWithRelations),
    } as ApiResponse);
  } catch (error) {
    console.error("Error actualizando producto:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// PATCH /api/products/:id/stock
router.patch("/:id/stock", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { stock, operation = "set" } = req.body as { stock: number; operation?: "set" | "add" | "subtract" };

    if (typeof stock !== "number" || stock < 0) {
      return res.status(400).json({ success: false, error: "El stock debe ser un número positivo" } as ApiResponse);
    }

    const exists = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) return res.status(404).json({ success: false, error: "Producto no encontrado" } as ApiResponse);

    const data =
      operation === "add" ? { stock: { increment: stock } } :
      operation === "subtract" ? { stock: { decrement: stock } } :
      { stock };

    const product = await prisma.product.update({
      where: { id },
      data,
      ...productWithRelations,
    });

    return res.json({
      success: true,
      message: "Stock actualizado exitosamente",
      data: normalizeProduct(product),
    } as ApiResponse);
  } catch (error) {
    console.error("Error actualizando stock:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// DELETE /api/products/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // First, check if the product exists
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        saleItems: true
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: "Producto no encontrado" } as ApiResponse);
    }

    // Check if product has been used in sales
    if (product.saleItems.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No se puede eliminar el producto porque ha sido utilizado en ventas. Puede desactivarlo en su lugar.",
        code: "PRODUCT_HAS_SALES"
      } as ApiResponse);
    }

    // If no sales, we can safely delete
    const deleted = await prisma.product.deleteMany({ where: { id, tenantId } });
    
    return res.json({ success: true, message: "Producto eliminado exitosamente" } as ApiResponse);
  } catch (error) {
    console.error("Error eliminando producto:", error);
    
    // Handle specific Prisma foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return res.status(400).json({ 
        success: false, 
        error: "No se puede eliminar el producto porque está siendo utilizado en el sistema. Puede desactivarlo en su lugar.",
        code: "FOREIGN_KEY_CONSTRAINT"
      } as ApiResponse);
    }
    
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

// GET /api/products/reports/low-stock
router.get("/reports/low-stock", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        AND: [{ active: true }, { stock: { lte: prisma.product.fields.minStock } }],
      },
      ...productWithRelations,
      orderBy: { stock: "asc" },
    });

    const normalized = products.map(normalizeProduct);
    return res.json({ success: true, data: normalized, count: normalized.length } as ApiResponse);
  } catch (error) {
    console.error("Error obteniendo productos con stock bajo:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor" } as ApiResponse);
  }
});

export default router;
