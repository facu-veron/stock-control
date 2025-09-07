const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// ✅ Importar tipos estandarizados
import type { 
  DocumentTypeUI, 
  TaxConditionUI, 
  InvoiceTypeUI,
  StandardizedCustomer 
} from './afip-types';

// Tipos definidos en el frontend
export interface User {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
  active: boolean
  createdAt: string
  updatedAt: string
  pin?: string | null // <-- Agregado para mostrar el pin en el frontend
}

export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost?: number
  stock: number
  minStock: number
  maxStock?: number
  sku?: string
  barcode?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  unit: string
  ivaRate?: number
  image?: string
  active: boolean
  createdAt: string
  updatedAt: string
  categoryId: string
  supplierId?: string
  category: {
    id: string
    name: string
    color?: string
  }
  supplier?: {
    id: string
    name: string
    contact?: string
  }
  tags: Tag[]
}

// Tipos para las peticiones
export interface LoginRequest {
  email: string
  password: string
  tenantName?: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  cost?: number
  stock: number
  minStock: number
  maxStock?: number
  sku?: string
  barcode?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  unit: string
  ivaRate?: number
  image?: string
  categoryId: string
  supplierId?: string
  tagIds?: string[]
  active?: boolean
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface CreateSupplierRequest {
  name: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export interface CreateEmployeeRequest {
  name: string
  email: string
  password?: string
  role?: "ADMIN" | "EMPLOYEE"
  active?: boolean
  pin?: string // <-- Agregado
}

export interface UpdateEmployeeRequest {
  name?: string
  email?: string
  password?: string
  role?: "ADMIN" | "EMPLOYEE"
  active?: boolean
  pin?: string // <-- Agregado
}

export interface CreateSaleRequest {
  employeeId: string;
  customerId?: string;
  customer?: Partial<Customer>; // ✅ Agregar customer inline
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
  invoiceType: InvoiceTypeUI; // ✅ Hacer requerido y tipado
  puntoVenta?: number;
  notes?: string;
  discount?: number;
}

// Tipos para las respuestas
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Función auxiliar para hacer peticiones con autenticación
async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  }

  const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong")
  }

  return data
}

// Auth API
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = (await fetchApi<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  })) as ApiResponse<AuthResponse>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Login failed")
}

export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const response = (await fetchApi<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  })) as ApiResponse<AuthResponse>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Registration failed")
}

// Products API - Corregido para manejar la respuesta paginada correctamente
export const getProducts = async (params?: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  supplierId?: string
  brand?: string
}): Promise<PaginatedResponse<Product>> => {
  const query = new URLSearchParams()
  if (params?.page) query.append("page", params.page.toString())
  if (params?.limit) query.append("limit", params.limit.toString())
  if (params?.search) query.append("search", params.search)
  if (params?.categoryId) query.append("categoryId", params.categoryId)
  if (params?.supplierId) query.append("supplierId", params.supplierId)
  if (params?.brand) query.append("brand", params.brand)

  // Para productos, el backend devuelve directamente la respuesta paginada
  const response = await fetchApi<Product>(`/products?${query.toString()}`)

  // Verificamos si es una respuesta paginada directa o envuelta en ApiResponse
  if ("pagination" in response) {
    return response as PaginatedResponse<Product>
  } else {
    // Si viene envuelta en ApiResponse, extraemos los datos
    const apiResponse = response as unknown as ApiResponse<PaginatedResponse<Product>>
    if (apiResponse.success) {
      return apiResponse.data
    }
    throw new Error(apiResponse.error || "Failed to fetch products")
  }
}

export const getProductById = async (id: string): Promise<Product> => {
  const response = (await fetchApi<Product>(`/products/${id}`)) as ApiResponse<Product>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch product")
}

export const createProduct = async (product: CreateProductRequest): Promise<Product> => {
  const response = (await fetchApi<Product>("/products", {
    method: "POST",
    body: JSON.stringify(product),
  })) as ApiResponse<Product>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to create product")
}

export const updateProduct = async (id: string, product: UpdateProductRequest): Promise<Product> => {
  const response = (await fetchApi<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  })) as ApiResponse<Product>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to update product")
}

export const deleteProduct = async (id: string): Promise<void> => {
  const response = (await fetchApi<null>(`/products/${id}`, {
    method: "DELETE",
  })) as ApiResponse<null>
  if (!response.success) {
    throw new Error(response.error || "Failed to delete product")
  }
}

// Categories API
export const getCategories = async (): Promise<Category[]> => {
  const response = await fetchApi<{items: Category[], total: number, take: number, skip: number}>("/categories")
  
  if ('success' in response && response.success) {
    // La respuesta tiene la estructura: { success: true, data: { items: [...], total, take, skip } }
    const apiResponse = response as ApiResponse<{items: Category[], total: number, take: number, skip: number}>
    return apiResponse.data.items // <- Aquí está el cambio clave
  }
  
  throw new Error("Failed to fetch categories")
}

export const getCategoryById = async (id: string): Promise<Category> => {
  const response = (await fetchApi<Category>(`/categories/${id}`)) as ApiResponse<Category>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch category")
}

export const createCategory = async (category: CreateCategoryRequest): Promise<Category> => {
  const response = (await fetchApi<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(category),
  })) as ApiResponse<Category>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to create category")
}

export const updateCategory = async (id: string, category: UpdateCategoryRequest): Promise<Category> => {
  const response = (await fetchApi<Category>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(category),
  })) as ApiResponse<Category>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to update category")
}

export const deleteCategory = async (id: string): Promise<void> => {
  const response = (await fetchApi<null>(`/categories/${id}`, {
    method: "DELETE",
  })) as ApiResponse<null>
  if (!response.success) {
    throw new Error(response.error || "Failed to delete category")
  }
}

// Employees API
export const getEmployees = async (): Promise<User[]> => {
  const response = (await fetchApi<User[]>("/employees")) as ApiResponse<User[]>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch employees")
}

export const getEmployeeById = async (id: string): Promise<User> => {
  const response = (await fetchApi<User>(`/employees/${id}`)) as ApiResponse<User>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch employee")
}

export const createEmployee = async (employee: CreateEmployeeRequest): Promise<User> => {
  const response = (await fetchApi<User>("/employees", {
    method: "POST",
    body: JSON.stringify(employee),
  })) as ApiResponse<User>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to create employee")
}

export const updateEmployee = async (id: string, employee: UpdateEmployeeRequest): Promise<User> => {
  const response = (await fetchApi<User>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(employee),
  })) as ApiResponse<User>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to update employee")
}

export const deleteEmployee = async (id: string): Promise<void> => {
  const response = (await fetchApi<null>(`/employees/${id}`, {
    method: "DELETE",
  })) as ApiResponse<null>
  if (!response.success) {
    throw new Error(response.error || "Failed to delete employee")
  }
}

// Suppliers API
export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = (await fetchApi<Supplier[]>("/suppliers")) as ApiResponse<Supplier[]>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch suppliers")
}

export const getSupplierById = async (id: string): Promise<Supplier> => {
  const response = (await fetchApi<Supplier>(`/suppliers/${id}`)) as ApiResponse<Supplier>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch supplier")
}

export const createSupplier = async (supplier: CreateSupplierRequest): Promise<Supplier> => {
  const response = (await fetchApi<Supplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify(supplier),
  })) as ApiResponse<Supplier>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to create supplier")
}

export const updateSupplier = async (id: string, supplier: UpdateSupplierRequest): Promise<Supplier> => {
  const response = (await fetchApi<Supplier>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(supplier),
  })) as ApiResponse<Supplier>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to update supplier")
}

export const deleteSupplier = async (id: string): Promise<void> => {
  const response = (await fetchApi<null>(`/suppliers/${id}`, {
    method: "DELETE",
  })) as ApiResponse<null>
  if (!response.success) {
    throw new Error(response.error || "Failed to delete supplier")
  }
}

// Tags API
export const getTags = async (): Promise<Tag[]> => {
  const response = (await fetchApi<Tag[]>("/tags")) as ApiResponse<Tag[]>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch tags")
}

export const createTag = async (tag: Omit<Tag, "id">): Promise<Tag> => {
  const response = (await fetchApi<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify(tag),
  })) as ApiResponse<Tag>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to create tag")
}

export const createSale = async (sale: CreateSaleRequest) => {
  console.log("🔍 createSale: enviando datos:", sale);
  const response = await fetchApi<any>("/sales/create", {
    method: "POST",
    body: JSON.stringify(sale),
  });
  console.log("🔍 createSale: respuesta completa del backend:", response);
  
  // ✅ Verificar si la respuesta tiene la estructura esperada
  if (response && response.success) {
    console.log("✅ createSale: respuesta exitosa, datos:", response.data || response);
    return response.data || response;
  }
  
  console.error("❌ createSale: respuesta con error:", response);
  // Cast para acceder a propiedades de error
  const errorResponse = response as any;
  throw new Error(errorResponse?.error || errorResponse?.message || "Failed to create sale");
}

export const verifyPin = async (pin: string): Promise<any> => {
  const response = await fetchApi<any>("/sales/validate-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
  }) as any; // ✅ No asumir estructura ApiResponse
  
  console.log("🔍 Respuesta completa de verifyPin:", response);
  
  if (response.success) {
    // ✅ El backend devuelve userId/userName directamente en la respuesta
    const employee = {
      id: response.userId,
      name: response.userName,
      email: "", // El backend no devuelve email en esta respuesta
      role: "EMPLOYEE" as const, // Asumir EMPLOYEE por defecto
      active: true,
    };
    
    console.log("✅ Employee creado:", employee);
    return employee;
  }
  
  throw new Error(response.error || "PIN verification failed");
};

// Sales API
export const getSales = async (): Promise<any[]> => {
  const response = (await fetchApi<any[]>("/sales")) as ApiResponse<any[]>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch sales")
};

export const getSaleById = async (id: string): Promise<any> => {
  const response = (await fetchApi<any>(`/sales/${id}`)) as ApiResponse<any>
  if (response.success) {
    return response.data
  }
  throw new Error(response.error || "Failed to fetch sale")
};



export interface Customer {
  id: string;
  name: string;
  documentType: DocumentTypeUI;
  documentNumber: string;
  taxStatus: TaxConditionUI;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  taxCondition?: TaxConditionUI; // ✅ Duplicado temporal por compatibilidad
  postalCode?: string;
  country?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  documentType: DocumentTypeUI;
  documentNumber: string;
  taxStatus: TaxConditionUI;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await fetchApi<Customer[]>("/customers") as ApiResponse<Customer[]>;
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || "Failed to fetch customers");
};

export const getCustomerById = async (id: string): Promise<Customer> => {
  const response = await fetchApi<Customer>(`/customers/${id}`) as ApiResponse<Customer>;
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || "Failed to fetch customer");
};

export const createCustomer = async (customer: CreateCustomerRequest): Promise<Customer> => {
  console.log("🔍 createCustomer: datos a enviar:", customer);
  
  try {
    const response = await fetchApi<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    }) as ApiResponse<Customer>;
    
    console.log("🔍 createCustomer: respuesta completa:", response);
    
    if (response.success) {
      console.log("✅ createCustomer: cliente creado exitosamente:", response.data);
      return response.data;
    }
    
    console.error("❌ createCustomer: error del backend:", response.error);
    throw new Error(response.error || "Failed to create customer");
  } catch (error) {
    console.error("🚨 createCustomer: error en fetchApi:", error);
    throw error;
  }
};

export const updateCustomer = async (id: string, customer: UpdateCustomerRequest): Promise<Customer> => {
  const response = await fetchApi<Customer>(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(customer),
  }) as ApiResponse<Customer>;
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error || "Failed to update customer");
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const response = await fetchApi<null>(`/customers/${id}`, {
    method: "DELETE",
  }) as ApiResponse<null>;
  if (!response.success) {
    throw new Error(response.error || "Failed to delete customer");
  }
};

// ✅ PUNTOS DE VENTA
export const getSalesPoints = async (): Promise<any[]> => {
  try {
    const response = await fetchApi<any>("/afip/points-of-sale", {
      method: "GET",
    });
    
    // Cast para acceder a propiedades específicas
    const responseData = response as any;
    
    // Verificar estructura de respuesta del backend
    if (responseData && responseData.success && Array.isArray(responseData.pointsOfSale)) {
      return responseData.pointsOfSale;
    } else if (responseData && Array.isArray(responseData.data)) {
      return responseData.data;
    } else if (Array.isArray(responseData)) {
      return responseData;
    }
    
    console.warn("⚠️ Respuesta de puntos de venta no es array:", responseData);
    return [];
  } catch (error) {
    console.error("❌ Error obteniendo puntos de venta:", error);
    return [];
  }
};

export const syncSalesPoints = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const response = await fetchApi<any>("/afip/points-of-sale/sync", {
      method: "POST",
    });
    return {
      success: true,
      message: "Puntos de venta sincronizados correctamente",
      data: response.data || response
    };
  } catch (error) {
    console.error("❌ Error sincronizando puntos de venta:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido"
    };
  }
};

// ✅ TEMPORAL: Crear puntos de venta de prueba
export const createTestSalesPoints = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const response = await fetchApi<any>("/afip/points-of-sale/create-test", {
      method: "POST",
    });
    
    const responseData = response as any;
    return {
      success: responseData.success || true,
      message: responseData.message || "Puntos de venta de prueba creados",
      data: responseData.pointsOfSale || responseData.data || response
    };
  } catch (error) {
    console.error("❌ Error creando puntos de venta de prueba:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido"
    };
  }
};
