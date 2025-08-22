import type { Request } from "express"
import type { 
  Tenant,
  Role, 
  TaxStatus, 
  DocumentType, 
  AfipMode,
  BillingInterval,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentProcessor,
  MPPaymentMethod,
  MPPreferenceStatus,
  MPPaymentMode
} from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & USER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  tenantId: string
  role: Role
  iat?: number
  exp?: number
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  firstName?: string | null
  lastName?: string | null
  role: Role
  active: boolean
  tenantId: string
  timezone?: string | null
  avatarUrl?: string | null
  lastLoginAt?: Date | null
}

export interface TenantInfo {
  id: string
  name: string
  cuit: string
  mode: AfipMode
  timezone: string
  currency: string
  logoUrl?: string | null
  website?: string | null
  phoneNumber?: string | null
  address?: string | null
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
    name: string;
  };
  tenant?: Tenant;
  tenantId?: string;
  id?: string; // Request ID para tracking
}

// Tipos para AFIP
export interface AfipTokenData {
  token: string;
  sign: string;
  generationTime: Date;
  expirationTime: Date;
}

export interface AfipInvoiceRequest {
  saleId: string;
  invoiceType: "FACTURA_A" | "FACTURA_B" | "FACTURA_C";
  pointOfSale: number;
}

export interface AfipInvoiceResponse {
  cae: string;
  caeExpiry: string;
  invoiceNumber: number;
  status: "APPROVED" | "REJECTED";
  observations?: string[];
  errors?: string[];
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
  requestId?: string;
}

// Tipos para configuración multitenant
export interface TenantConfig {
  maxUsers?: number;
  maxProducts?: number;
  maxSales?: number;
  features?: string[];
  billingPlan?: string;
}

// Tipos para rate limiting
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  tenantBased?: boolean;
}

// Tipos para auditoría
export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "SYNC" | "RENEW";
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// Tipos para métricas
export interface TenantMetrics {
  tenantId: string;
  date: Date;
  salesCount: number;
  totalRevenue: number;
  activeUsers: number;
  productCount: number;
  customerCount: number;
}

// Tipos para configuración de servicios
export interface ServiceConfig {
  afip: {
    enabled: boolean;
    mode: "HOMOLOGACION" | "PRODUCCION";
    tokenRenewalEnabled: boolean;
  };
  billing: {
    enabled: boolean;
    processor: "STRIPE" | "MERCADOPAGO";
  };
  notifications: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
  };
}

// Tipos para errores personalizados
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  tenantId?: string;
  userId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflicto con el estado actual del recurso") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class AfipError extends AppError {
  afipCode?: string;
  afipMessage?: string;

  constructor(message: string, afipCode?: string, afipMessage?: string) {
    super(message, 503);
    this.name = "AfipError";
    this.afipCode = afipCode;
    this.afipMessage = afipMessage;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  meta?: {
    pagination?: PaginationMeta
    filters?: Record<string, any>
    tenant?: {
      id: string
      name: string
    }
    timestamp?: string
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
  tenantCuit?: string // Opcional si el email es único globalmente
}

export interface PinLoginRequest {
  pin: string
  tenantId: string
}

export interface RegisterTenantRequest {
  // Datos del tenant
  tenantName: string
  tenantCuit: string
  tenantMode?: AfipMode
  tenantTimezone?: string
  tenantCurrency?: string
  tenantPhone?: string
  tenantAddress?: string
  tenantWebsite?: string
  
  // Datos del usuario admin
  userName: string
  userEmail: string
  userPassword: string
  userFirstName?: string
  userLastName?: string
  userTimezone?: string
}

export interface LoginResponse {
  success: boolean
  data?: {
    token: string
    user: AuthenticatedUser
    tenant: TenantInfo
    expiresIn: number
  }
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// USER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  firstName?: string | null
  lastName?: string | null
  role: Role
  active: boolean
  tenantId: string
  timezone?: string | null
  avatarUrl?: string | null
  phoneNumber?: string | null
  lastLoginAt?: Date | null
  pinHash?: string | null
  pinLastUsedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  role?: Role
  phoneNumber?: string
  timezone?: string
  pin?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: Role
  phoneNumber?: string
  timezone?: string
  avatarUrl?: string
  active?: boolean
}

export interface SetPinRequest {
  pin: string
  confirmPin: string
  currentPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  tenantId: string
  name: string
  description?: string | null
  color?: string | null
  sortOrder?: number | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  sortOrder?: number
}

export interface UpdateCategoryRequest {
  name?: string
  description?: string
  color?: string
  sortOrder?: number
}

export interface Supplier {
  id: string
  tenantId: string
  name: string
  contact?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  taxId?: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    products: number
  }
}

export interface CreateSupplierRequest {
  name: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
}

export interface UpdateSupplierRequest {
  name?: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
}

export interface Tag {
  id: string
  tenantId: string
  name: string
  color?: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    productTags: number
  }
}

export interface CreateTagRequest {
  name: string
  color?: string
}

export interface UpdateTagRequest {
  name?: string
  color?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  tenantId: string
  name: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  price: number
  cost?: number | null
  stock: number
  minStock: number
  maxStock?: number | null
  reservedStock: number
  trackInventory: boolean
  unit: string
  brand?: string | null
  color?: string | null
  size?: string | null
  material?: string | null
  weight?: number | null
  dimensions?: string | null
  ivaRate?: number | null
  active: boolean
  image?: string | null
  images?: string[] | null
  searchKeywords?: string | null
  categoryId: string
  supplierId?: string | null
  createdAt: Date
  updatedAt: Date
  // Relaciones
  category?: Category
  supplier?: Supplier | null
  tags?: Tag[]
  _count?: {
    saleItems: number
    stockMovements: number
  }
}

export interface CreateProductRequest {
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  stock?: number
  minStock?: number
  maxStock?: number
  trackInventory?: boolean
  unit?: string
  categoryId: string
  supplierId?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  weight?: number
  dimensions?: string
  ivaRate?: number
  image?: string
  images?: string[]
  searchKeywords?: string
  active?: boolean
  tagIds?: string[]
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  price?: number
  cost?: number
  stock?: number
  minStock?: number
  maxStock?: number
  trackInventory?: boolean
  unit?: string
  categoryId?: string
  supplierId?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  weight?: number
  dimensions?: string
  ivaRate?: number
  image?: string
  images?: string[]
  searchKeywords?: string
  active?: boolean
  tagIds?: string[]
}

export interface StockUpdateRequest {
  productId: string
  quantity: number
  operation: "set" | "add" | "subtract"
  reason?: string
  reference?: string
  notes?: string
}

export interface BulkStockUpdateRequest {
  updates: StockUpdateRequest[]
  reason?: string
  reference?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  tenantId: string
  name: string
  documentType: DocumentType
  documentNumber: string
  taxStatus: TaxStatus
  email?: string | null
  phoneNumber?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  creditLimit?: number | null
  paymentTerms?: number | null
  discount?: number | null
  active: boolean
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    sales: number
  }
}

export interface CreateCustomerRequest {
  name: string
  documentType: DocumentType
  documentNumber: string
  taxStatus: TaxStatus
  email?: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  creditLimit?: number
  paymentTerms?: number
  discount?: number
  notes?: string
}

export interface UpdateCustomerRequest {
  name?: string
  documentType?: DocumentType
  documentNumber?: string
  taxStatus?: TaxStatus
  email?: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  creditLimit?: number
  paymentTerms?: number
  discount?: number
  active?: boolean
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleItem {
  id: string
  tenantId: string
  saleId: string
  productId: string
  productName: string
  skuSnapshot?: string | null
  unitPrice: number
  unitCost?: number | null
  quantity: number
  discount?: number | null
  ivaRate?: number | null
  lineTotal: number
  createdAt: Date
  product?: Product
}

export interface Sale {
  id: string
  tenantId: string
  saleNumber?: string | null
  reference?: string | null
  employeeId?: string | null
  customerId?: string | null
  posId?: string | null
  subtotal: number
  taxTotal?: number | null
  discountTotal?: number | null
  grandTotal: number
  ptoVta: number
  cbteTipo: number
  cbteNro?: number | null
  cae?: string | null
  caeVto?: Date | null
  afipStatus?: string | null
  afipError?: string | null
  status: string
  paymentStatus: string
  notes?: string | null
  saleDate: Date
  dueDate?: Date | null
  createdAt: Date
  updatedAt: Date
  // Relaciones
  employee?: User | null
  customer?: Customer | null
  items?: SaleItem[]
  _count?: {
    items: number
  }
}

export interface CreateSaleRequest {
  customerId?: string
  posId?: string
  reference?: string
  notes?: string
  saleDate?: Date
  dueDate?: Date
  items: {
    productId: string
    quantity: number
    unitPrice?: number // Si no se envía, usar precio del producto
    discount?: number
  }[]
}

export interface UpdateSaleRequest {
  customerId?: string
  reference?: string
  notes?: string
  saleDate?: Date
  dueDate?: Date
  status?: string
  paymentStatus?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductFilters extends PaginationParams {
  categoryId?: string
  supplierId?: string
  active?: boolean
  lowStock?: boolean
  outOfStock?: boolean
  minPrice?: number
  maxPrice?: number
  tags?: string[]
  barcode?: string
  sku?: string
}

export interface SaleFilters extends PaginationParams {
  employeeId?: string
  customerId?: string
  status?: string
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  saleNumber?: string
  reference?: string
}

export interface CustomerFilters extends PaginationParams {
  documentType?: DocumentType
  taxStatus?: TaxStatus
  active?: boolean
  city?: string
  state?: string
  documentNumber?: string
}

export interface UserFilters extends PaginationParams {
  role?: Role
  active?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// MERCADOPAGO TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MPCredential {
  id: string
  tenantId: string
  publicKey: string
  accessToken: string
  clientId?: string | null
  clientSecret?: string | null
  isProduction: boolean
  country: string
  webhookSecret?: string | null
  webhookUrl?: string | null
  commissionRate?: number | null
  fixedCommission?: number | null
  isActive: boolean
  isValidated: boolean
  lastValidatedAt?: Date | null
  validationError?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateMPCredentialRequest {
  publicKey: string
  accessToken: string
  clientId?: string
  clientSecret?: string
  isProduction: boolean
  country?: string
  webhookSecret?: string
  webhookUrl?: string
  commissionRate?: number
  fixedCommission?: number
}

export interface MPPreference {
  id: string
  tenantId: string
  credentialId: string
  mpPreferenceId: string
  initPoint?: string | null
  sandboxInitPoint?: string | null
  externalReference?: string | null
  description: string
  mode: MPPaymentMode
  status: MPPreferenceStatus
  totalAmount: number
  currency: string
  items: any
  successUrl?: string | null
  failureUrl?: string | null
  pendingUrl?: string | null
  maxInstallments?: number | null
  excludedPaymentMethods?: any | null
  excludedPaymentTypes?: any | null
  payerEmail?: string | null
  payerName?: string | null
  payerPhone?: string | null
  payerIdentification?: any | null
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateMPPreferenceRequest {
  credentialId: string
  externalReference?: string
  description: string
  totalAmount: number
  currency?: string
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
    description?: string
  }>
  successUrl?: string
  failureUrl?: string
  pendingUrl?: string
  maxInstallments?: number
  excludedPaymentMethods?: string[]
  excludedPaymentTypes?: string[]
  payerEmail?: string
  payerName?: string
  payerPhone?: string
  expiresAt?: Date
}

export interface MPPayment {
  id: string
  tenantId: string
  credentialId: string
  preferenceId?: string | null
  mpPaymentId: string
  mpOrderId?: string | null
  externalReference?: string | null
  status: string
  statusDetail?: string | null
  paymentMethod: MPPaymentMethod
  paymentTypeId?: string | null
  transactionAmount: number
  totalPaidAmount?: number | null
  netReceivedAmount?: number | null
  currency: string
  mercadopagoFee?: number | null
  platformFee?: number | null
  payerEmail?: string | null
  payerName?: string | null
  payerPhone?: string | null
  payerIdentification?: any | null
  cardLastFourDigits?: string | null
  cardFirstSixDigits?: string | null
  cardExpirationMonth?: number | null
  cardExpirationYear?: number | null
  cardholderName?: string | null
  installments?: number | null
  installmentAmount?: number | null
  dateApproved?: Date | null
  dateCreated?: Date | null
  dateLastUpdated?: Date | null
  description?: string | null
  metadata?: any | null
  webhookPayload?: any | null
  invoiceId?: string | null
  createdAt: Date
  updatedAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK MOVEMENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface StockMovement {
  id: string
  tenantId: string
  productId: string
  userId?: string | null
  type: string
  quantity: number
  reason?: string | null
  reference?: string | null
  stockBefore: number
  stockAfter: number
  unitCost?: number | null
  totalCost?: number | null
  notes?: string | null
  createdAt: Date
  product?: Product
  user?: User | null
}

export interface CreateStockMovementRequest {
  productId: string
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "SALE" | "RETURN"
  quantity: number
  reason?: string
  reference?: string
  unitCost?: number
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT SETTINGS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantSettings {
  id: string
  tenantId: string
  businessName?: string | null
  businessAddress?: string | null
  businessPhone?: string | null
  businessEmail?: string | null
  businessWebsite?: string | null
  defaultTaxRate?: number | null
  invoicePrefix?: string | null
  invoiceStartNumber?: number | null
  salePrefix?: string | null
  saleStartNumber?: number | null
  lowStockAlert: boolean
  negativeStockAllowed: boolean
  autoReduceStock: boolean
  pricesIncludeTax: boolean
  allowPriceModification: boolean
  requireCostPrice: boolean
  theme?: string | null
  language: string
  dateFormat: string
  timeFormat: string
  currency: string
  currencySymbol: string
  emailNotifications: boolean
  smsNotifications: boolean
  lowStockNotifications: boolean
  salesNotifications: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UpdateTenantSettingsRequest {
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessWebsite?: string
  defaultTaxRate?: number
  invoicePrefix?: string
  invoiceStartNumber?: number
  salePrefix?: string
  saleStartNumber?: number
  lowStockAlert?: boolean
  negativeStockAllowed?: boolean
  autoReduceStock?: boolean
  pricesIncludeTax?: boolean
  allowPriceModification?: boolean
  requireCostPrice?: boolean
  theme?: string
  language?: string
  dateFormat?: string
  timeFormat?: string
  currency?: string
  currencySymbol?: string
  emailNotifications?: boolean
  smsNotifications?: boolean
  lowStockNotifications?: boolean
  salesNotifications?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CreateInput<T> = Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>

// Contexto de tenant para operaciones de base de datos
export interface TenantContext {
  tenantId: string
  userId?: string
  role?: Role
}

// Errores personalizados
export class TenantError extends Error {
  constructor(
    message: string,
    public tenantId: string,
    public code?: string
  ) {
    super(message)
    this.name = 'TenantError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public requiredRole?: Role[],
    public userRole?: Role
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Utilidades para validación
export const isValidTenantId = (tenantId: unknown): tenantId is string => {
  return typeof tenantId === 'string' && tenantId.length > 0
}

export const isValidRole = (role: unknown): role is Role => {
  return typeof role === 'string' && ['ADMIN', 'EMPLOYEE'].includes(role)
}

export const isValidDocumentType = (type: unknown): type is DocumentType => {
  return typeof type === 'string' && ['DNI', 'CUIT', 'CUIL', 'PASAPORTE'].includes(type)
}

export const isValidTaxStatus = (status: unknown): status is TaxStatus => {
  return typeof status === 'string' && 
    ['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL'].includes(status)
}