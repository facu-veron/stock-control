import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { toast } from "@/components/ui/use-toast"
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type CreateProductRequest,
  type UpdateProductRequest,
  type PaginatedResponse,
} from "@/lib/api"

interface ProductsState {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  isLoading: boolean
  error: string | null
}

interface ProductsActions {
  fetchProducts: (params?: {
    page?: number
    limit?: number
    search?: string
    supplierId?: string
    brand?: string
  }) => Promise<void>
  fetchProductById: (id: string) => Promise<Product | null>
  createProduct: (data: CreateProductRequest) => Promise<void>
  updateProduct: (id: string, data: UpdateProductRequest) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  deactivateProduct: (id: string) => Promise<void>
  reactivateProduct: (id: string) => Promise<void>
  clearError: () => void
}

type ProductsStore = ProductsState & ProductsActions

export const useProductsStore = create<ProductsStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      products: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      },
      isLoading: false,
      error: null,

      // Acciones
      fetchProducts: async (params) => {
        set({ isLoading: true, error: null })
        try {
          const response: PaginatedResponse<Product> = await getProducts(params)
          set({
            products: response.data,
            pagination: response.pagination,
            isLoading: false,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar productos"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      },

      fetchProductById: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const product = await getProductById(id)
          set({ isLoading: false })
          return product
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar el producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }
      },

      createProduct: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newProduct = await createProduct(data)
          set((state) => ({
            products: [...state.products, newProduct],
            isLoading: false,
          }))
          toast({
            title: "Producto creado",
            description: `El producto "${data.name}" ha sido creado exitosamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al crear producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al crear producto",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      updateProduct: async (id, data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedProduct = await updateProduct(id, data)
          set((state) => ({
            products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
            isLoading: false,
          }))
          toast({
            title: "Producto actualizado",
            description: `El producto "${updatedProduct.name}" ha sido actualizado correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al actualizar producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al actualizar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      deleteProduct: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await deleteProduct(id)
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
            isLoading: false,
          }))
          toast({
            title: "Producto eliminado",
            description: "El producto ha sido eliminado correctamente.",
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al eliminar producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al eliminar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      deactivateProduct: async (id) => {
        set({ isLoading: true, error: null })
        try {
          // Find the product first
          const product = get().products.find(p => p.id === id)
          if (!product) {
            throw new Error("Producto no encontrado")
          }

          // Update the product to set active = false
          const updatedProduct = await updateProduct(id, { ...product, active: false })
          set((state) => ({
            products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
            isLoading: false,
          }))
          toast({
            title: "Producto desactivado",
            description: `El producto "${updatedProduct.name}" ha sido desactivado correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al desactivar producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al desactivar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      reactivateProduct: async (id) => {
        set({ isLoading: true, error: null })
        try {
          // Find the product first
          const product = get().products.find(p => p.id === id)
          if (!product) {
            throw new Error("Producto no encontrado")
          }

          // Update the product to set active = true
          const updatedProduct = await updateProduct(id, { ...product, active: true })
          set((state) => ({
            products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
            isLoading: false,
          }))
          toast({
            title: "Producto reactivado",
            description: `El producto "${updatedProduct.name}" ha sido reactivado correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al reactivar producto"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al reactivar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: "products-store",
    },
  ),
)
