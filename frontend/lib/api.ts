const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  details?: any[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: "ADMIN" | "EMPLOYEE"
}

export interface User {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EMPLOYEE"
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  categoryId: string
  category?: Category
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
}

export interface UpdateCategoryRequest {
  name?: string
  description?: string
}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  stock: number
  categoryId: string
}

export interface UpdateProductRequest {
  name?: string
  description?: string
  price?: number
  stock?: number
  categoryId?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Cargar token del localStorage si existe
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  removeToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers as Record<string, string>,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request("/auth/profile")
  }

  // Categories endpoints
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request("/categories")
  }

  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    return this.request(`/categories/${id}`)
  }

  async createCategory(category: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify(category),
    })
  }

  async updateCategory(id: string, category: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
    return this.request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    })
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return this.request(`/categories/${id}`, {
      method: "DELETE",
    })
  }

  // Products endpoints
  async getProducts(params?: {
    search?: string
    category?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ products: Product[]; pagination: any }>> {
    const searchParams = new URLSearchParams()

    if (params?.search) searchParams.append("search", params.search)
    if (params?.category) searchParams.append("category", params.category)
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `/products?${queryString}` : "/products"

    return this.request(endpoint)
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return this.request(`/products/${id}`)
  }

  async createProduct(product: CreateProductRequest): Promise<ApiResponse<Product>> {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(product),
    })
  }

  async updateProduct(id: string, product: UpdateProductRequest): Promise<ApiResponse<Product>> {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    })
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.request(`/products/${id}`, {
      method: "DELETE",
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
