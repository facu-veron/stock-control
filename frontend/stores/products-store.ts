import { create } from "zustand"
import { apiClient, type Product, type CreateProductRequest, type UpdateProductRequest } from "@/lib/api"

interface ProductsState {
  products: Product[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface ProductsActions {
  fetchProducts: (params?: {
    search?: string
    category?: string
    page?: number
    limit?: number
  }) => Promise<void>
  createProduct: (product: CreateProductRequest) => Promise<void>
  updateProduct: (id: string, product: UpdateProductRequest) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  clearError: () => void
}

type ProductsStore = ProductsState & ProductsActions

export const useProductsStore = create<ProductsStore>((set, get) => ({
  // State
  products: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  // Actions
  fetchProducts: async (params) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.getProducts(params)

      if (response.success && response.data) {
        set({
          products: response.data.products,
          pagination: response.data.pagination,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Failed to fetch products")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch products",
        isLoading: false,
      })
    }
  },

  createProduct: async (product: CreateProductRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.createProduct(product)

      if (response.success && response.data) {
        set((state) => ({
          products: [...state.products, response.data!],
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to create product")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create product",
        isLoading: false,
      })
      throw error
    }
  },

  updateProduct: async (id: string, product: UpdateProductRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.updateProduct(id, product)

      if (response.success && response.data) {
        set((state) => ({
          products: state.products.map((prod) => (prod.id === id ? response.data! : prod)),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to update product")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update product",
        isLoading: false,
      })
      throw error
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.deleteProduct(id)

      if (response.success) {
        set((state) => ({
          products: state.products.filter((prod) => prod.id !== id),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to delete product")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete product",
        isLoading: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
