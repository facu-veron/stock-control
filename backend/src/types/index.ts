import type { Request } from "express"

export interface User {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
  active: boolean
  createdAt: Date
  updatedAt: Date
}
export interface CreateEmployeeRequest {
  name: string
  email: string
  password?: string
  role: "ADMIN" | "EMPLOYEE"
  pin?: string
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {}
export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  stock: number
  minStock: number
  maxStock?: number
  unit: string
  brand?: string
  color?: string
  size?: string
  material?: string
  ivaRate?: number
  image?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  categoryId: string
  supplierId?: string
  category?: Category
  supplier?: Supplier
  tags?: Tag[]
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
  active: boolean
}


export interface JwtPayload {
  userId: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
}

export interface ApiResponse {
  success: boolean
  message?: string
  data?: any
  error?: string
  details?: any[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
  role?: "ADMIN" | "EMPLOYEE"
}

export interface CreateCategoryData {
  name: string
  description?: string
  color?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  color?: string
}

export interface CreateSupplierData {
  name: string
  contact?: string
  email?: string
  phone?: string
}

export interface UpdateSupplierData {
  name?: string
  contact?: string
  email?: string
  phone?: string
}
export interface CreateSupplierRequest {
  name: string
  contact?: string
  email?: string
  phone?: string
}

export interface UpdateSupplierRequest {
  name?: string
  contact?: string
  email?: string
  phone?: string
}

export interface CreateTagData {
  name: string
}

export interface UpdateTagData {
  name?: string
}

export interface CreateProductData {
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  stock?: number
  minStock?: number
  maxStock?: number
  unit?: string
  categoryId: string
  supplierId?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  ivaRate?: number
  image?: string
  active?: boolean
  tagIds?: string[]
}

export interface UpdateProductData {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  price?: number
  cost?: number
  stock?: number
  minStock?: number
  maxStock?: number
  unit?: string
  categoryId?: string
  supplierId?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  ivaRate?: number
  image?: string
  active?: boolean
  tagIds?: string[]
}

export interface StockUpdateData {
  stock: number
  operation?: "set" | "add" | "subtract"
}

// types.ts

export interface CreateCustomerRequest {
  name: string
  documentType: "DNI" | "CUIT" | "CUIL" | "PASAPORTE"
  documentNumber: string
  taxStatus: "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTISTA" | "EXENTO" | "CONSUMIDOR_FINAL"
  email?: string
  address?: string
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {}
