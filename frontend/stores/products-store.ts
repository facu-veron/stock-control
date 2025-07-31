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
    pages: number
  }
  filters: {
    search: string
    category: string
  }
}

interface ProductsActions {
  fetchProducts: (params?: {
    search?: string
    category?: string
    page?: number
    limit?: number
  }) => Promise<void>
  createProduct: (product: CreateProductRequest) => Promise<Product>
  updateProduct: (id: string, product: UpdateProductRequest) => Promise<Product>
  deleteProduct: (id: string) => Promise<void>
  setFilters: (filters: Partial<ProductsState["filters"]>) => void
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
    pages: 0,
  },
  filters: {
    search: "",
    category: "",
  },

  // Actions
  fetchProducts: async (params) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.getProducts(params)

      if (response.success && response.data) {
        const { products, pagination } = response.data
        set({
          products,
          pagination: pagination || get().pagination,
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

  createProduct: async (productData: CreateProductRequest) => {
    set({ error: null })

    try {
      const response = await apiClient.createProduct(productData)

      if (response.success && response.data) {
        const newProduct = response.data
        set((state) => ({
          products: [...state.products, newProduct],
        }))
        return newProduct
      } else {
        throw new Error(response.error || "Failed to create product")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create product"
      set({ error: errorMessage })
      throw error
    }
  },

  updateProduct: async (id: string, productData: UpdateProductRequest) => {
    set({ error: null })

    try {
      const response = await apiClient.updateProduct(id, productData)

      if (response.success && response.data) {
        const updatedProduct = response.data
        set((state) => ({
          products: state.products.map((product) => (product.id === id ? updatedProduct : product)),
        }))
        return updatedProduct
      } else {
        throw new Error(response.error || "Failed to update product")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update product"
      set({ error: errorMessage })
      throw error
    }
  },

  deleteProduct: async (id: string) => {
    set({ error: null })

    try {
      const response = await apiClient.deleteProduct(id)

      if (response.success) {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }))
      } else {
        throw new Error(response.error || "Failed to delete product")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product"
      set({ error: errorMessage })
      throw error
    }
  },

  setFilters: (newFilters: Partial<ProductsState["filters"]>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },

  clearError: () => set({ error: null }),
}))
