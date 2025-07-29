import { Router, type Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { body, validationResult } from "express-validator"
import { PrismaClient, type Role } from "@prisma/client"
import { authenticateToken } from "../middleware/auth"
import type { AuthenticatedRequest, ApiResponse } from "../types"

const router = Router()
const prisma = new PrismaClient()

// Validaciones
const validateRegister = [
  body("email").isEmail().withMessage("Email inválido").normalizeEmail(),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es requerido")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("role").optional().isIn(["ADMIN", "EMPLOYEE"]).withMessage("Rol inválido"),
]

const validateLogin = [
  body("email").isEmail().withMessage("Email inválido").normalizeEmail(),
  body("password").notEmpty().withMessage("La contraseña es requerida"),
]

interface RegisterBody {
  email: string
  name: string
  password: string
  role?: Role
}

interface LoginBody {
  email: string
  password: string
}

// POST /api/auth/register - Registrar usuario
router.post("/register", validateRegister, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { email, name, password, role = "EMPLOYEE" }: RegisterBody = req.body

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "El usuario ya existe",
      } as ApiResponse)
      return
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    // Generar token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user,
        token,
      },
    } as ApiResponse)
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// POST /api/auth/login - Iniciar sesión
router.post("/login", validateLogin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { email, password }: LoginBody = req.body

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      } as ApiResponse)
      return
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: "Credenciales inválidas",
      } as ApiResponse)
      return
    }

    // Generar token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    })

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
        },
        token,
      },
    } as ApiResponse)
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    } as ApiResponse)
  }
})

// GET /api/auth/me - Obtener información del usuario actual
router.get("/me", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.user,
  } as ApiResponse)
})

// POST /api/auth/logout - Cerrar sesión
router.post("/logout", authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  } as ApiResponse)
})

export default router
