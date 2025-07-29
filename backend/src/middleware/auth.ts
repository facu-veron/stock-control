import type { Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient, type Role } from "@prisma/client"
import type { AuthenticatedRequest, JwtPayload } from "../types"

const prisma = new PrismaClient()

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Token de acceso requerido",
    })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    })

    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: "Usuario no válido o inactivo",
      })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(403).json({
      success: false,
      error: "Token inválido",
    })
  }
}

export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Usuario no autenticado",
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Permisos insuficientes",
        message: "No tienes permisos para realizar esta acción",
      })
      return
    }

    next()
  }
}
