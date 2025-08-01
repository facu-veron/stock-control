import { create } from "zustand"
import { apiClient, type Category, type CreateCategoryRequest, type UpdateCategoryRequest } from "@/lib/api"

interface CategoriesState {
  categories: Category[]
  isLoading: boolean
  error: string | null
}

interface CategoriesActions {
  fetchCategories: () => Promise<void>
  createCategory: (category: CreateCategoryRequest) => Promise<void>
  updateCategory: (id: string, category: UpdateCategoryRequest) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  clearError: () => void
}

type CategoriesStore = CategoriesState & CategoriesActions

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  // State
  categories: [],
  isLoading: false,
  error: null,

  // Actions
  fetchCategories: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.getCategories()

      if (response.success && response.data) {
        set({
          categories: response.data,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Failed to fetch categories")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch categories",
        isLoading: false,
      })
    }
  },

  createCategory: async (category: CreateCategoryRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.createCategory(category)

      if (response.success && response.data) {
        set((state) => ({
          categories: [...state.categories, response.data!],
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to create category")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create category",
        isLoading: false,
      })
      throw error
    }
  },

  updateCategory: async (id: string, category: UpdateCategoryRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.updateCategory(id, category)

      if (response.success && response.data) {
        set((state) => ({
          categories: state.categories.map((cat) => (cat.id === id ? response.data! : cat)),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to update category")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update category",
        isLoading: false,
      })
      throw error
    }
  },

  deleteCategory: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.deleteCategory(id)

      if (response.success) {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to delete category")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete category",
        isLoading: false,
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
