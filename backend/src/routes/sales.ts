import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { body, validationResult } from "express-validator"
import { authenticateToken } from "../middleware/auth"
import type { AuthenticatedRequest } from "../types"

const prisma = new PrismaClient()
const router = Router()

/**
 * POST /sales/validate-pin
 * Valida el PIN de un empleado para autorizar la venta
 */
router.post(
  "/validate-pin",
  authenticateToken,
  body("pin").isString().notEmpty(),
  async (req: AuthenticatedRequest, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: "PIN inválido", details: errors.array() })
    }

    const { pin } = req.body

    try {
      const user = await prisma.user.findFirst({
        where: {
          pin,
          active: true,
          role: "EMPLOYEE", // opcional: solo empleados pueden autorizar ventas
        },
      })

      if (!user) {
        return res.status(401).json({ success: false, error: "PIN incorrecto o usuario no autorizado" })
      }

      res.json({ success: true, message: "PIN válido", userId: user.id })
    } catch (error) {
      console.error("❌ Error validando el PIN:", error)
      res.status(500).json({ success: false, error: "Error interno del servidor" })
    }
  }
)

export default router
