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

    // Buscar usuario con información del tenant incluida
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        tenantId: true,
        timezone: true,
        avatarUrl: true,
        lastLoginAt: true,
        // Incluir información del tenant
        Tenant: {
          select: {
            id: true,
            name: true,
            cuit: true,
            mode: true,
            timezone: true,
            currency: true,
            logoUrl: true,
            website: true,
            phoneNumber: true,
            address: true,
          }
        }
      },
    })

    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: "Usuario no válido o inactivo",
      })
      return
    }

    // Verificar que el tenant también esté activo (si decides agregar ese campo)
    if (!user.Tenant) {
      res.status(401).json({
        success: false,
        error: "Tenant no encontrado",
      })
      return
    }

    // Actualizar última vez que se logueó (opcional)
    if (process.env.TRACK_LOGIN_TIME === 'true') {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {
        // Ignorar errores en esta actualización para no bloquear la request
      })
    }

    // Agregar tanto user como tenant a la request.
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    }

    req.tenant = user.Tenant as any;

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: "Token expirado",
        code: "TOKEN_EXPIRED"
      })
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        success: false,
        error: "Token inválido",
        code: "INVALID_TOKEN"
      })
      return
    }

    // Error de base de datos u otro
    console.error("Error en autenticación:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
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
        message: `Se requiere uno de los siguientes roles: ${roles.join(", ")}`,
        requiredRoles: roles,
        userRole: req.user.role,
      })
      return
    }

    next()
  }
}

/**
 * Middleware para asegurar que solo los ADMIN puedan acceder
 */
export const requireAdmin = requireRole(["ADMIN"])

/**
 * Middleware para verificar que el usuario pertenezca al tenant correcto
 * Útil cuando el tenantId viene como parámetro en la URL
 */
export const validateTenantAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Usuario no autenticado",
    })
    return
  }

  const urlTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId

  // Si no hay tenantId en la URL, continuar (el usuario solo puede acceder a su propio tenant)
  if (!urlTenantId) {
    next()
    return
  }

  // Verificar que el tenantId de la URL coincida con el del usuario
  if (urlTenantId !== req.user.tenantId) {
    res.status(403).json({
      success: false,
      error: "Acceso denegado al tenant solicitado",
      message: "No tienes permisos para acceder a los datos de este tenant",
    })
    return
  }

  next()
}

/**
 * Middleware para inyectar automáticamente el tenantId en consultas
 * Agrega el tenantId del usuario autenticado a req.query para facilitar consultas
 */
export const injectTenantId = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Usuario no autenticado",
    })
    return
  }

  // Inyectar tenantId en query params para facilitar consultas
  if (!req.query.tenantId) {
    req.query.tenantId = req.user.tenantId
  }

  // También en body si es POST/PUT/PATCH
  if (req.method !== 'GET' && req.body && typeof req.body === 'object') {
    if (!req.body.tenantId) {
      req.body.tenantId = req.user.tenantId
    }
  }

  next()
}

/**
 * Middleware para verificar permisos de PIN en operaciones sensibles
 * Útil para operaciones como ventas o modificaciones de precios
 */
export const requireValidPin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Usuario no autenticado",
    })
    return
  }

  const { pin } = req.body

  if (!pin) {
    res.status(400).json({
      success: false,
      error: "PIN requerido para esta operación",
    })
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { 
        id: req.user.id,
        tenantId: req.user.tenantId, // Asegurar que sea del mismo tenant
      },
      select: {
        id: true,
        pinHash: true,
        pinLastUsedAt: true,
      },
    })

    if (!user || !user.pinHash) {
      res.status(400).json({
        success: false,
        error: "PIN no configurado para este usuario",
      })
      return
    }

    // Aquí deberías usar bcrypt para comparar el PIN
    // const bcrypt = require('bcrypt')
    // const isValidPin = await bcrypt.compare(pin, user.pinHash)
    
    // Por ahora, comparación directa (¡CAMBIAR en producción!)
    const isValidPin = pin === user.pinHash

    if (!isValidPin) {
      res.status(401).json({
        success: false,
        error: "PIN incorrecto",
      })
      return
    }

    // Actualizar última vez que se usó el PIN
    await prisma.user.update({
      where: { id: user.id },
      data: { pinLastUsedAt: new Date() },
    }).catch(() => {
      // Ignorar errores en esta actualización
    })

    next()
  } catch (error) {
    console.error("Error validando PIN:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    })
  }
}

/**
 * Middleware combinado: autenticación + inyección de tenantId
 * Útil para la mayoría de rutas protegidas
 */
export const authenticateAndInjectTenant = [
  authenticateToken,
  injectTenantId,
]

/**
 * Middleware combinado: autenticación + solo admin + inyección de tenantId
 */
export const authenticateAdmin = [
  authenticateToken,
  requireAdmin,
  injectTenantId,
]