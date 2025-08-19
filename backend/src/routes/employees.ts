import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireRole } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const router = Router();

// Listar empleados (solo ADMIN)
router.get("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const employees = await prisma.user.findMany({
      where: { tenantId, role: Role.EMPLOYEE },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, pinLastUsedAt: true },
    });
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error("Error al listar empleados:", error);
    res.status(500).json({ success: false, error: "Error interno al obtener empleados" });
  }
});

// Crear empleado (solo ADMIN)
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { name, email, password, pin } = req.body as { name: string; email: string; password: string; pin?: string | number };

  try {
    const exists = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
    if (exists) {
      return res.status(400).json({ success: false, error: "El email ya está registrado en este tenant" });
    }

    const passwordHash = await bcrypt.hash((password ?? "") + (process.env.PASSWORD_PEPPER ?? ""), 12);
    const pinHash = pin ? await bcrypt.hash(String(pin), 10) : null;

    const newEmployee = await prisma.user.create({
      data: { tenantId, name, email, password: passwordHash, pinHash, role: Role.EMPLOYEE },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return res.status(201).json({ success: true, data: newEmployee });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    return res.status(500).json({ success: false, error: "Error al crear empleado" });
  }
});

export default router;
