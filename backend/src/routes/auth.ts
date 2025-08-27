import { Router, type Response } from "express";
import { body, validationResult } from "express-validator";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { ApiResponse, AuthenticatedRequest } from "../types";
import { authenticateToken, requireRole } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

/* =========================
 * Helpers
 * =======================*/
const ok = (res: Response, data: unknown, message?: string) =>
  res.json({ success: true, message, data } as ApiResponse);
const created = (res: Response, data: unknown, message?: string) =>
  res.status(201).json({ success: true, message, data } as ApiResponse);
const fail = (res: Response, code: number, error: string, details?: unknown) =>
  res.status(code).json({ success: false, error, details } as ApiResponse);

const signToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  });

/* =========================
 * Validations
 * =======================*/
const validateSignup = [
  body("tenantName").trim().isLength({ min: 2, max: 100 }),
  body("tenantCuit").trim().isLength({ min: 8, max: 20 }),
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
];

const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 1 }),
  body("tenantName").optional().isString().isLength({ min: 2 }),
  body("tenantCuit").optional().isString().isLength({ min: 8 }),
];

const validateRegister = [
  body("email").isEmail().normalizeEmail(),
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("password").isLength({ min: 8 }),
  body("role").optional().isIn(["ADMIN", "EMPLOYEE"]),
];

/* =========================
 * POST /api/auth/signup  (PÚBLICO)
 * Crea Tenant + primer ADMIN. No mezcla tenants.
 * =======================*/
router.post(
  "/signup",
  validateSignup,
  async (req: any, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fail(res, 400, "Datos inválidos", errors.array());
        return;
      }

      const { tenantName, tenantCuit, name, email, password } = req.body as {
        tenantName: string;
        tenantCuit: string;
        name: string;
        email: string;
        password: string;
      };

      // Verifica unicidad de tenant
      const existingTenant = await prisma.tenant.findFirst({
        where: { OR: [{ name: tenantName }, { cuit: tenantCuit }] },
      });
      if (existingTenant) {
        fail(res, 409, "El tenant ya existe (nombre o CUIT)");
        return;
      }

      const hashed = await bcrypt.hash(
        password + (process.env.PASSWORD_PEPPER ?? ""),
        12
      );

      // Transacción: crear Tenant y primer ADMIN
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: tenantName, cuit: tenantCuit },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name,
            email,
            password: hashed,
            role: Role.ADMIN,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            createdAt: true,
          },
        });

        return { tenant, user };
      });

      // (Opcional) emitir token ya logueado
      const token = signToken({
        userId: result.user.id,
        tenantId: result.tenant.id,
        role: result.user.role,
        email: result.user.email,
      });

      created(res, { ...result, token }, "Tenant y usuario ADMIN creados");
    } catch (error) {
      console.error("Error en signup:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * POST /api/auth/login  (PÚBLICO)
 * Requiere identificar el tenant por nombre o CUIT + credenciales.
 * Devuelve JWT con tenantId para aislar datos.
 * =======================*/
router.post(
  "/login",
  validateLogin,
  async (req: any, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fail(res, 400, "Datos inválidos", errors.array());
        return;
      }

      const { email, password, tenantName, tenantCuit } = req.body as {
        email: string;
        password: string;
        tenantName?: string;
        tenantCuit?: string;
      };

      if (!tenantName && !tenantCuit) {
        fail(res, 400, "Debes enviar tenantName o tenantCuit");
        return;
      }

      // Resuelve el tenant por nombre o CUIT
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            tenantName ? { name: tenantName } : undefined,
            tenantCuit ? { cuit: tenantCuit } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (!tenant) {
        fail(res, 404, "Tenant no encontrado");
        return;
      }

      // 1. Obtener el usuario completo (incluyendo password) para validar
      const userFull = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
      });
      // 2. Obtener solo los datos públicos para la respuesta
      const user = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!userFull || !userFull.active) {
        fail(res, 401, "Credenciales inválidas");
        return;
      }

      const valid = await bcrypt.compare(
        password + (process.env.PASSWORD_PEPPER ?? ""),
        userFull.password
      );
      if (!valid) {
        fail(res, 401, "Credenciales inválidas");
        return;
      }

      const token = signToken({
        userId: user!.id,
        tenantId: tenant.id,
        role: user!.role,
        email: user!.email,
      });

      ok(res, { token, user }, "Login exitoso");
    } catch (error) {
      console.error("Error en login:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * POST /api/auth/register  (PROTEGIDO, ADMIN)
 * Crea usuario dentro del mismo tenant del token.
 * No acepta tenantId en el body → evita mezclar datos.
 * =======================*/
router.post(
  "/register",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateRegister,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fail(res, 400, "Datos de entrada inválidos", errors.array());
        return;
      }

      const tenantId = req.user!.tenantId;
      const {
        email,
        name,
        password,
        role = "EMPLOYEE",
      }: { email: string; name: string; password: string; role?: "ADMIN" | "EMPLOYEE" } =
        req.body;

      // Unicidad por tenant
      const existing = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (existing) {
        fail(res, 409, "El usuario ya existe");
        return;
      }

      const hashed = await bcrypt.hash(
        password + (process.env.PASSWORD_PEPPER ?? ""),
        12
      );

      const user = await prisma.user.create({
        data: { tenantId, email, name, password: hashed, role: role as Role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      created(res, { user }, "Usuario registrado exitosamente");
    } catch (error) {
      console.error("Error en registro:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

export default router;
