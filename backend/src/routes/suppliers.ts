import { Router, type Response } from "express"
import { body, validationResult } from "express-validator"
import { PrismaClient } from "@prisma/client"
import { authenticateToken, requireRole } from "../middleware/auth"
import type { AuthenticatedRequest, ApiResponse } from "../types"

const router = Router()
const prisma = new PrismaClient()

// Validación de entrada
const validateSupplier = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido"),
  body("contact")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("El contacto no puede exceder los 100 caracteres"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ser un email válido"),
  body("phone")
    .optional()
    .isLength({ min: 6, max: 20 })
    .withMessage("El teléfono debe tener entre 6 y 20 caracteres"),
]

// GET /api/suppliers - Listar proveedores
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    } as ApiResponse)
  } catch (error) {
    console.error("Error al obtener proveedores:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// GET /api/suppliers/:id - Obtener proveedor por ID
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: "Proveedor no encontrado",
      } as ApiResponse)
      return
    }

    res.json({
      success: true,
      data: supplier,
    } as ApiResponse)
  } catch (error) {
    console.error("Error al obtener proveedor:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// POST /api/suppliers - Crear proveedor
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateSupplier,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: errors.array(),
        } as ApiResponse)
        return
      }

      const { name, contact, email, phone } = req.body

      const supplier = await prisma.supplier.create({
        data: { name, contact, email, phone },
      })

      res.status(201).json({
        success: true,
        message: "Proveedor creado exitosamente",
        data: supplier,
      } as ApiResponse)
    } catch (error) {
      console.error("Error al crear proveedor:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// PUT /api/suppliers/:id - Actualizar proveedor
router.put(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateSupplier,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: errors.array(),
        } as ApiResponse)
        return
      }

      const { id } = req.params
      const { name, contact, email, phone } = req.body

      const supplier = await prisma.supplier.update({
        where: { id },
        data: { name, contact, email, phone },
      })

      res.json({
        success: true,
        message: "Proveedor actualizado exitosamente",
        data: supplier,
      } as ApiResponse)
    } catch (error) {
      console.error("Error al actualizar proveedor:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

// DELETE /api/suppliers/:id - Eliminar proveedor
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const productsCount = await prisma.product.count({
        where: { supplierId: id },
      })

      if (productsCount > 0) {
        res.status(400).json({
          success: false,
          error: "No se puede eliminar el proveedor",
          message: `Tiene ${productsCount} producto(s) asociado(s)`,
        } as ApiResponse)
        return
      }

      await prisma.supplier.delete({ where: { id } })

      res.json({
        success: true,
        message: "Proveedor eliminado exitosamente",
      } as ApiResponse)
    } catch (error) {
      console.error("Error al eliminar proveedor:", error)
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      } as ApiResponse)
    }
  },
)

export default router
