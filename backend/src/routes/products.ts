import { Router, type Response } from "express"
import { body, validationResult } from "express-validator"
import { PrismaClient } from "@prisma/client"
import { authenticateToken, requireRole } from "../middleware/auth"
import type { AuthenticatedRequest, ApiResponse } from "../types"

const router = Router()
const prisma = new PrismaClient()

// Middleware de validación
const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 200 })
    .withMessage("El nombre debe tener entre 2 y 200 caracteres"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("La descripción no puede exceder 1000 caracteres"),
  body("sku").optional().trim().isLength({ max: 50 }).withMessage("El SKU no puede exceder 50 caracteres"),
  body("barcode")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("El código de barras no puede exceder 50 caracteres"),
  body("price").isFloat({ min: 0 }).withMessage("El precio debe ser un número positivo"),
  body("cost").optional().isFloat({ min: 0 }).withMessage("El costo debe ser un número positivo"),
  body("stock").optional().isInt({ min: 0 }).withMessage("El stock debe ser un número entero positivo"),
  body("minStock").optional().isInt({ min: 0 }).withMessage("El stock mínimo debe ser un número entero positivo"),
  body("maxStock").optional().isInt({ min: 0 }).withMessage("El stock máximo debe ser un número entero positivo"),
  body("unit").optional().trim().isLength({ max: 20 }).withMessage("La unidad no puede exceder 20 caracteres"),
  body("categoryId")
    .notEmpty()
    .withMessage("La categoría es requerida")
    .isString()
    .withMessage("ID de categoría inválido"),
  body("active").optional().isBoolean().withMessage("El estado activo debe ser verdadero o falso"),
]

interface ProductBody {
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  stock?: number
  minStock?: number
  maxStock?: number
  unit?: string
  categoryId: string
  image?: string
  active?: boolean
}

interface StockUpdateBody {
  stock: number
  operation?: "set" | "add" | "subtract"
}

// GET /api/products - Obtener todos los productos
router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      category = "",
      active = "",
      sortBy = "name",
      sortOrder = "asc",
      lowStock = "false",
    } = req.query as Record<string, string>

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const take = Number.parseInt(limit)

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.categoryId = category
    }

    if (active !== "") {
      where.active = active === "true"
    }

    if (lowStock === "true") {
      where.stock = { lte: prisma.product.fields.minStock }
    }

    // Construir ordenamiento
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ])

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / Number.parseInt(limit)),
      },
    } as ApiResponse)
  } catch (error) {
    console.error("Error obteniendo productos:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// GET /api/products/:id - Obtener un producto por ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    if (!product) {
      res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      } as ApiResponse)
      return
    }

    res.json({
      success: true,
      data: product,
    } as ApiResponse)
  } catch (error) {
    console.error("Error obteniendo producto:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// POST /api/products - Crear nuevo producto
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateProduct,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Datos de entrada inválidos",
          details: errors.array(),
        } as ApiResponse)
        return
      }

      const {
        name,
        description,
        sku,
        barcode,
        price,
        cost = 0,
        stock = 0,
        minStock = 0,
        maxStock,
        unit = "unidad",
        categoryId,
        image,
        active = true,
      }: ProductBody = req.body

      // Verificar que la categoría existe
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        res.status(400).json({
          success: false,
          error: "Categoría no encontrada",
        } as ApiResponse)
        return
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          sku,
          barcode,
          price,
          cost,
          stock,
          minStock,
          maxStock,
          unit,
          categoryId,
          image,
          active,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      })

      res.status(201).json({
        success: true,
        message: "Producto creado exitosamente",
        data: product,
      } as ApiResponse)
    } catch (error) {
      console.error("Error creando producto:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// PUT /api/products/:id - Actualizar producto
router.put(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateProduct,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Datos de entrada inválidos",
          details: errors.array(),
        } as ApiResponse)
        return
      }

      const { id } = req.params
      const {
        name,
        description,
        sku,
        barcode,
        price,
        cost,
        stock,
        minStock,
        maxStock,
        unit,
        categoryId,
        image,
        active,
      }: ProductBody = req.body

      // Verificar que la categoría existe
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        res.status(400).json({
          success: false,
          error: "Categoría no encontrada",
        } as ApiResponse)
        return
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          name,
          description,
          sku,
          barcode,
          price,
          cost,
          stock,
          minStock,
          maxStock,
          unit,
          categoryId,
          image,
          active,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      })

      res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        data: product,
      } as ApiResponse)
    } catch (error) {
      console.error("Error actualizando producto:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// PATCH /api/products/:id/stock - Actualizar solo el stock
router.patch("/:id/stock", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { stock, operation = "set" }: StockUpdateBody = req.body

    if (typeof stock !== "number" || stock < 0) {
      res.status(400).json({
        success: false,
        error: "El stock debe ser un número positivo",
      } as ApiResponse)
      return
    }

    let updateData: any = {}

    if (operation === "add") {
      updateData = { stock: { increment: stock } }
    } else if (operation === "subtract") {
      updateData = { stock: { decrement: stock } }
    } else {
      updateData = { stock }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    res.json({
      success: true,
      message: "Stock actualizado exitosamente",
      data: product,
    } as ApiResponse)
  } catch (error) {
    console.error("Error actualizando stock:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// DELETE /api/products/:id - Eliminar producto
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      await prisma.product.delete({
        where: { id },
      })

      res.json({
        success: true,
        message: "Producto eliminado exitosamente",
      } as ApiResponse)
    } catch (error) {
      console.error("Error eliminando producto:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// GET /api/products/reports/low-stock - Obtener productos con stock bajo
router.get("/reports/low-stock", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.minStock },
        active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { stock: "asc" },
    })

    res.json({
      success: true,
      data: products,
      count: products.length,
    } as ApiResponse)
  } catch (error) {
    console.error("Error obteniendo productos con stock bajo:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

export default router
