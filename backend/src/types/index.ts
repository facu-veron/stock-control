import type { Request } from "express"
import type { Role } from "@prisma/client"

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    role: Role
    active: boolean
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  details?: any[]
}

export interface PaginationParams {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ProductFilters {
  search?: string
  category?: string
  active?: string
  lowStock?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface CategoryFilters {
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface JwtPayload {
  userId: string
  iat?: number
  exp?: number
}

export interface ValidationError {
  field: string
  message: string
}
