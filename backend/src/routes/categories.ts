import { Router, type Response } from "express";
import { body, validationResult, param, query } from "express-validator";
import { PrismaClient, Prisma } from "@prisma/client";
import { authenticateToken, requireRole } from "../middleware/auth";
import type { AuthenticatedRequest, ApiResponse } from "../types";

const router = Router();
const prisma = new PrismaClient();

/* =========================
 * Helpers (sin genéricos)
 * =======================*/
const ok = (res: Response, data: unknown, message?: string) =>
  res.json({ success: true, message, data } as ApiResponse);

const created = (res: Response, data: unknown, message?: string) =>
  res.status(201).json({ success: true, message, data } as ApiResponse);

const fail = (res: Response, code: number, error: string, details?: unknown) =>
  res.status(code).json({ success: false, error, details } as ApiResponse);

const toBool = (v: unknown): boolean =>
  typeof v === "string"
    ? ["1", "true", "t", "yes", "y"].includes(v.toLowerCase())
    : !!v;

/* =========================
 * Validations
 * =======================*/
const validateCategory = [
  body("name")
    .trim()
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
];

const idParam = [param("id").isString().notEmpty().withMessage("Id inválido")];

const includeProductsQuery = [
  query("include_products").optional().isBoolean().toBoolean(),
];

const paginationQuery = [
  query("take").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("skip").optional().isInt({ min: 0 }).toInt(),
];

/* =========================
 * Types locales
 * =======================*/
interface CategoryQuery {
  include_products?: boolean | string;
  take?: number | string;
  skip?: number | string;
}

/* =========================
 * GET /api/categories
 * =======================*/
router.get(
  "/",
  authenticateToken,
  ...includeProductsQuery,
  ...paginationQuery,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user!.tenantId;
      const { include_products = false, take: takeQ, skip: skipQ } =
        (req.query as unknown as CategoryQuery) ?? {};

      const includeProducts = toBool(include_products);
      const take = Math.min(Number(takeQ ?? 20), 100);
      const skip = Number(skipQ ?? 0);

      const [items, total] = await prisma.$transaction([
        prisma.category.findMany({
          where: { tenantId },
          include: {
            products: includeProducts
              ? {
                  where: { tenantId },
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    active: true,
                  },
                }
              : false,
            _count: { select: { products: true } },
          },
          orderBy: { name: "asc" },
          take,
          skip,
        }),
        prisma.category.count({ where: { tenantId } }),
      ]);

      ok(res, { items, total, take, skip });
    } catch (error) {
      console.error("Error obteniendo categorías:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * GET /api/categories/:id
 * =======================*/
router.get(
  "/:id",
  authenticateToken,
  ...idParam,
  ...includeProductsQuery,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const valErrs = validationResult(req);
      if (!valErrs.isEmpty()) {
        fail(res, 400, "Parámetros inválidos", valErrs.array());
        return;
      }

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { include_products = false } =
        (req.query as unknown as CategoryQuery) ?? {};
      const includeProducts = toBool(include_products);

      const category = await prisma.category.findFirst({
        where: { id, tenantId },
        include: {
          products: includeProducts
            ? {
                where: { tenantId },
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                  active: true,
                },
              }
            : false,
          _count: { select: { products: true } },
        },
      });

      if (!category) {
        fail(res, 404, "Categoría no encontrada");
        return;
      }

      ok(res, category);
    } catch (error) {
      console.error("Error obteniendo categoría:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * POST /api/categories
 * =======================*/
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  validateCategory,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fail(res, 400, "Datos de entrada inválidos", errors.array());
        return;
      }

      const tenantId = req.user!.tenantId;
      const {
        name,
        description,
        color,
      }: { name: string; description?: string; color?: string } = req.body;

      const category = await prisma.category.create({
        data: {
          tenantId,
          name,
          description,
          color: (color ?? "#3B82F6").toUpperCase(),
        },
        include: { _count: { select: { products: true } } },
      });

      created(res, category, "Categoría creada exitosamente");
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Única definida en schema: @@unique([tenantId, name])
        fail(res, 409, "Conflicto: ya existe una categoría con ese nombre");
        return;
      }
      console.error("Error creando categoría:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * PUT /api/categories/:id
 * =======================*/
router.put(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  ...idParam,
  validateCategory,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fail(res, 400, "Datos de entrada inválidos", errors.array());
        return;
      }

      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const {
        name,
        description,
        color,
      }: { name: string; description?: string; color?: string } = req.body;

      // Con tu schema actual, no hay unique (id, tenantId), por eso usamos updateMany.
      const updated = await prisma.category.updateMany({
        where: { id, tenantId },
        data: { name, description, color },
      });

      if (updated.count === 0) {
        fail(res, 404, "Categoría no encontrada");
        return;
      }

      const category = await prisma.category.findFirst({
        where: { id, tenantId },
        include: { _count: { select: { products: true } } },
      });

      ok(res, category, "Categoría actualizada exitosamente");
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          // choque con @@unique([tenantId, name])
          fail(res, 409, "Conflicto: ya existe una categoría con ese nombre");
          return;
        }
      }
      console.error("Error actualizando categoría:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

/* =========================
 * DELETE /api/categories/:id
 * =======================*/
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  ...idParam,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const valErrs = validationResult(req);
      if (!valErrs.isEmpty()) {
        fail(res, 400, "Parámetros inválidos", valErrs.array());
        return;
      }

      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      // Opción A (tu enfoque actual): prevenir con un count
      const productsCount = await prisma.product.count({
        where: { categoryId: id, tenantId },
      });

      if (productsCount > 0) {
        fail(
          res,
          400,
          "No se puede eliminar la categoría",
          `La categoría tiene ${productsCount} producto(s) asociado(s)`
        );
        return;
      }

      // Con tu schema actual (sin unique id+tenantId) usamos deleteMany
      const deleted = await prisma.category.deleteMany({
        where: { id, tenantId },
      });

      if (deleted.count === 0) {
        fail(res, 404, "Categoría no encontrada");
        return;
      }

      ok(res, null, "Categoría eliminada exitosamente");
    } catch (error) {
      // Si no prevenís con count, podrías atrapar una FK (depende de constraints)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          fail(
            res,
            400,
            "No se puede eliminar la categoría: tiene productos asociados"
          );
          return;
        }
      }
      console.error("Error eliminando categoría:", error);
      fail(res, 500, "Error interno del servidor");
    }
  }
);

export default router;
