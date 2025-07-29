import { Router, type Response } from "express"
import { body, validationResult } from "express-validator"
import { PrismaClient } from "@prisma/client"
import { authenticateToken, requireRole } from "../middleware/auth"
import type { AuthenticatedRequest, ApiResponse } from "../types"

const router = Router()
const prisma = new PrismaClient()

// Middleware de validación
const validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("El color debe ser un código hexadecimal válido"),
]

interface CategoryBody {
  name: string
  description?: string
  color?: string
}

interface CategoryQuery {
  include_products?: string
}

// GET /api/categories - Obtener todas las categorías
router.get("/", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { include_products = "false" }: CategoryQuery = req.query as CategoryQuery

    const categories = await prisma.category.findMany({
      include: {
        products:
          include_products === "true"
            ? {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  active: true,
                },
              }
            : false,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    })

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    } as ApiResponse)
  } catch (error) {
    console.error("Error obteniendo categorías:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// GET /api/categories/:id - Obtener una categoría por ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { include_products = "false" }: CategoryQuery = req.query as CategoryQuery

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products:
          include_products === "true"
            ? {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  active: true,
                },
              }
            : false,
        _count: {
          select: { products: true },
        },
      },
    })

    if (!category) {
      res.status(404).json({
        success: false,
        error: "Categoría no encontrada",
      } as ApiResponse)
      return
    }

    res.json({
      success: true,
      data: category,
    } as ApiResponse)
  } catch (error) {
    console.error("Error obteniendo categoría:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// POST /api/categories - Crear nueva categoría
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateCategory,
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

      const { name, description, color }: CategoryBody = req.body

      const category = await prisma.category.create({
        data: {
          name,
          description,
          color: color || "#3b82f6",
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      })

      res.status(201).json({
        success: true,
        message: "Categoría creada exitosamente",
        data: category,
      } as ApiResponse)
    } catch (error) {
      console.error("Error creando categoría:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// PUT /api/categories/:id - Actualizar categoría
router.put(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateCategory,
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
      const { name, description, color }: CategoryBody = req.body

      const category = await prisma.category.update({
        where: { id },
        data: {
          name,
          description,
          color,
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      })

      res.json({
        success: true,
        message: "Categoría actualizada exitosamente",
        data: category,
      } as ApiResponse)
    } catch (error) {
      console.error("Error actualizando categoría:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// DELETE /api/categories/:id - Eliminar categoría
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      // Verificar si la categoría tiene productos
      const productsCount = await prisma.product.count({
        where: { categoryId: id },
      })

      if (productsCount > 0) {
        res.status(400).json({
          success: false,
          error: "No se puede eliminar la categoría",
          message: `La categoría tiene ${productsCount} producto(s) asociado(s)`,
        } as ApiResponse)
        return
      }

      await prisma.category.delete({
        where: { id },
      })

      res.json({
        success: true,
        message: "Categoría eliminada exitosamente",
      } as ApiResponse)
    } catch (error) {
      console.error("Error eliminando categoría:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

export default router
