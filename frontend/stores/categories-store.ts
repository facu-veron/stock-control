import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { toast } from "@/components/ui/use-toast"
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "@/lib/api"

interface CategoriesState {
  categories: Category[]
  isLoading: boolean
  error: string | null
}

interface CategoriesActions {
  fetchCategories: () => Promise<void>
  fetchCategoryById: (id: string) => Promise<Category | null>
  createCategory: (data: Omit<Category, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  clearError: () => void
}

type CategoriesStore = CategoriesState & CategoriesActions

export const useCategoriesStore = create<CategoriesStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      categories: [],
      isLoading: false,
      error: null,

      // Acciones
      fetchCategories: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getCategories()
          set({ categories: data, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar categorías"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      },

      fetchCategoryById: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const category = await getCategoryById(id)
          set({ isLoading: false })
          return category
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar la categoría"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }
      },

      createCategory: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newCategory = await createCategory(data)
          set((state) => ({
            categories: [...state.categories, newCategory],
            isLoading: false,
          }))
          toast({
            title: "Categoría creada",
            description: `La categoría "${data.name}" ha sido creada exitosamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al crear categoría"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al crear categoría",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      updateCategory: async (id, data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedCategory = await updateCategory(id, data)
          set((state) => ({
            categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
            isLoading: false,
          }))
          toast({
            title: "Categoría actualizada",
            description: `La categoría "${updatedCategory.name}" ha sido actualizada correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al actualizar categoría"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al actualizar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      deleteCategory: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await deleteCategory(id)
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
            isLoading: false,
          }))
          toast({
            title: "Categoría eliminada",
            description: "La categoría ha sido eliminada correctamente.",
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al eliminar categoría"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al eliminar",
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
      name: "categories-store",
    },
  ),
)
