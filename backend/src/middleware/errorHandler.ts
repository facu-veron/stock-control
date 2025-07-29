import type { Request, Response, NextFunction } from "express"
import { Prisma } from "@prisma/client"
import type { ValidationError } from "express-validator"

interface CustomError extends Error {
  status?: number
  code?: string
  meta?: any
  errors?: ValidationError[]
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  console.error("Error:", err)

  // Error de validación de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        res.status(400).json({
          success: false,
          error: "Conflicto de datos únicos",
          message: "Ya existe un registro con estos datos",
          field: err.meta?.target,
        })
        return

      case "P2025":
        res.status(404).json({
          success: false,
          error: "Registro no encontrado",
          message: "El registro solicitado no existe",
        })
        return

      case "P2003":
        res.status(400).json({
          success: false,
          error: "Error de relación",
          message: "Violación de restricción de clave foránea",
        })
        return

      default:
        res.status(500).json({
          success: false,
          error: "Error de base de datos",
          message: "Error interno del servidor",
          code: err.code,
        })
        return
    }
  }

  // Error de validación
  if (err.name === "ValidationError") {
    res.status(400).json({
      success: false,
      error: "Error de validación",
      message: err.message,
      details: err.errors,
    })
    return
  }

  // Error de JWT
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      error: "Token inválido",
      message: "El token de autenticación no es válido",
    })
    return
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      error: "Token expirado",
      message: "El token de autenticación ha expirado",
    })
    return
  }

  // Error genérico del servidor
  res.status(err.status || 500).json({
    success: false,
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : "Algo salió mal",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

export default errorHandler
