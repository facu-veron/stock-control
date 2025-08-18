// src/middleware/tenant.ts
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../types"

export function resolveTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // prioridad: user del token -> header -> query
  const fromUser = req.user?.tenantId
  const fromHeader = req.header("X-Tenant-Id") || undefined
  const fromQuery = typeof req.query.tenantId === "string" ? req.query.tenantId : undefined

  req.tenantId = fromUser || fromHeader || fromQuery
  if (!req.tenantId) {
    return res.status(400).json({ success: false, error: "Tenant no identificado" })
  }
  return next()
}
