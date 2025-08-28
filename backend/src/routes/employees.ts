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
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, phone: true, pinHash: true },
    });
    // No podemos obtener el pin original desde el hash, así que devolvemos N/A o null
    const employeesWithPin = employees.map(e => ({ ...e, pin: null }));
    res.json({ success: true, data: employeesWithPin });
  } catch (error) {
    console.error("Error al listar empleados:", error);
    res.status(500).json({ success: false, error: "Error interno al obtener empleados" });
  }
});

// GET /employees/:id (obtener empleado por ID)
router.get("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    
    const employee = await prisma.user.findFirst({
      where: { id, tenantId, role: Role.EMPLOYEE },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, phone: true, pinHash: true },
    });
    
    if (!employee) {
      return res.status(404).json({ success: false, error: "Empleado no encontrado" });
    }
    
    // No podemos devolver el pin original, solo null
    const employeeWithPin = { ...employee, pin: null };
    res.json({ success: true, data: employeeWithPin });
  } catch (error) {
    console.error("Error al obtener empleado:", error);
    res.status(500).json({ success: false, error: "Error interno al obtener empleado" });
  }
});

// Crear empleado (solo ADMIN)
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { name, email, password, pin, phone } = req.body as { name: string; email: string; password: string; pin?: string | number; phone?: string };

  try {
    const exists = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
    if (exists) {
      return res.status(400).json({ success: false, error: "El email ya está registrado en este tenant" });
    }

    const passwordHash = await bcrypt.hash((password ?? "") + (process.env.PASSWORD_PEPPER ?? ""), 12);
    const pinHash = pin ? await bcrypt.hash(String(pin), 10) : null;

    const newEmployee = await prisma.user.create({
      data: { tenantId, name, email, password: passwordHash, pinHash, role: Role.EMPLOYEE, phone },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, phone: true },
    });
    // Devolver el pin en claro solo en la respuesta de creación
    return res.status(201).json({ success: true, data: { ...newEmployee, pin: pin ?? null } });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    return res.status(500).json({ success: false, error: "Error al crear empleado" });
  }
});

// PUT /employees/:id (editar empleado)
router.put("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const { name, email, password, pin, role, active, phone } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    pin?: string | number;
    role?: string;
    active?: boolean;
    phone?: string;
  };

  try {
    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "Empleado no encontrado" });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
    if (phone !== undefined) data.phone = phone;
    if (password) {
      data.password = await bcrypt.hash(password + (process.env.PASSWORD_PEPPER ?? ""), 12);
    }
    if (pin) {
      data.pinHash = await bcrypt.hash(String(pin), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, phone: true },
    });
    // Devolver el pin en claro solo si fue actualizado, si no, null
    return res.json({ success: true, data: { ...updated, pin: pin ?? null } });
  } catch (error) {
    console.error("Error al editar empleado:", error);
    return res.status(500).json({ success: false, error: "Error al editar empleado" });
  }
});

export default router;
