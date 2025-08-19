import { Router } from "express";
import { prisma } from "../lib/prisma";
import { body, validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import bcrypt from "bcryptjs";

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
      return res.status(400).json({ success: false, error: "PIN inválido", details: errors.array() });
    }

    const tenantId = req.user!.tenantId;
    const { pin } = req.body as { pin: string };

    try {
      // Buscar empleados del tenant con pinHash
      const employees = await prisma.user.findMany({
        where: { tenantId, active: true, role: "EMPLOYEE", NOT: { pinHash: null } },
        select: { id: true, pinHash: true },
        take: 500, // Bound de seguridad
      });

      for (const u of employees) {
        if (u.pinHash && await bcrypt.compare(String(pin), u.pinHash)) {
          await prisma.user.update({ where: { id: u.id }, data: { pinLastUsedAt: new Date() } });
          return res.json({ success: true, message: "PIN válido", userId: u.id });
        }
      }

      return res.status(401).json({ success: false, error: "PIN incorrecto o usuario no autorizado" });
    } catch (error) {
      console.error("❌ Error validando el PIN:", error);
      return res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }
);

export default router;
