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
  body("supplierId").optional().isString().withMessage("ID de proveedor inválido"),
  body("brand").optional().trim().isLength({ max: 100 }).withMessage("La marca no puede exceder 100 caracteres"),
  body("color").optional().trim().isLength({ max: 50 }).withMessage("El color no puede exceder 50 caracteres"),
  body("size").optional().trim().isLength({ max: 50 }).withMessage("El tamaño no puede exceder 50 caracteres"),
  body("material").optional().trim().isLength({ max: 100 }).withMessage("El material no puede exceder 100 caracteres"),
  body("ivaRate").optional().isFloat({ min: 0, max: 100 }).withMessage("La tasa de IVA debe estar entre 0 y 100"),
  body("active").optional().isBoolean().withMessage("El estado activo debe ser verdadero o falso"),
  body("tags").optional().isArray().withMessage("Las etiquetas deben ser un array"),
  body("tags.*").optional().isString().withMessage("Cada etiqueta debe ser un string"),
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
  supplierId?: string
  image?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  ivaRate?: number
  active?: boolean
  tags?: string[]
}

interface StockUpdateBody {
  stock: number
  operation?: "set" | "add" | "subtract"
}

// GET /api/products - Obtener todos los productos con filtros y paginación
router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      category = "",
      supplier = "",
      brand = "",
      active = "",
      sortBy = "name",
      sortOrder = "asc",
      lowStock = "false",
      tags = "",
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
        { brand: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      where.categoryId = category
    }

    if (supplier) {
      where.supplierId = supplier
    }

    if (brand) {
      where.brand = { contains: brand, mode: "insensitive" }
    }

    if (active !== "") {
      where.active = active === "true"
    }

    if (lowStock === "true") {
      where.AND = [
        ...(where.AND || []),
        {
          stock: {
            lte: prisma.product.fields.minStock,
          },
        },
      ]
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim())
      where.tags = {
        some: {
          name: { in: tagArray },
        },
      }
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
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
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
        supplier: {
          select: {
            id: true,
            name: true,
            contact: true,
            email: true,
            phone: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
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
        supplierId,
        image,
        brand,
        color,
        size,
        material,
        ivaRate,
        active = true,
        tags = [],
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

      // Verificar que el proveedor existe (si se proporciona)
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
        })

        if (!supplier) {
          res.status(400).json({
            success: false,
            error: "Proveedor no encontrado",
          } as ApiResponse)
          return
        }
      }

      // Procesar tags - crear los que no existen
      const tagConnections = []
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
          tagConnections.push({ id: tag.id })
        }
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
          supplierId,
          image,
          brand,
          color,
          size,
          material,
          ivaRate,
          active,
          tags: {
            connect: tagConnections,
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
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
        supplierId,
        image,
        brand,
        color,
        size,
        material,
        ivaRate,
        active,
        tags = [],
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

      // Verificar que el proveedor existe (si se proporciona)
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
        })

        if (!supplier) {
          res.status(400).json({
            success: false,
            error: "Proveedor no encontrado",
          } as ApiResponse)
          return
        }
      }

      // Procesar tags - crear los que no existen
      const tagConnections = []
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
          tagConnections.push({ id: tag.id })
        }
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
          supplierId,
          image,
          brand,
          color,
          size,
          material,
          ivaRate,
          active,
          tags: {
            set: [], // Desconectar todas las tags existentes
            connect: tagConnections, // Conectar las nuevas tags
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
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
        supplier: {
          select: {
            id: true,
            name: true,
            contact: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
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
        AND: [
          { active: true },
          {
            stock: {
              lte: prisma.product.fields.minStock,
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            contact: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
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
