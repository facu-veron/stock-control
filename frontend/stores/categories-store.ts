import { create } from "zustand"
import { apiClient, type Category, type CreateCategoryRequest, type UpdateCategoryRequest } from "@/lib/api"

interface CategoriesState {
  categories: Category[]
  isLoading: boolean
  error: string | null
}

interface CategoriesActions {
  fetchCategories: () => Promise<void>
  createCategory: (category: CreateCategoryRequest) => Promise<Category>
  updateCategory: (id: string, category: UpdateCategoryRequest) => Promise<Category>
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

  createCategory: async (categoryData: CreateCategoryRequest) => {
    set({ error: null })

    try {
      const response = await apiClient.createCategory(categoryData)

      if (response.success && response.data) {
        const newCategory = response.data
        set((state) => ({
          categories: [...state.categories, newCategory],
        }))
        return newCategory
      } else {
        throw new Error(response.error || "Failed to create category")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create category"
      set({ error: errorMessage })
      throw error
    }
  },

  updateCategory: async (id: string, categoryData: UpdateCategoryRequest) => {
    set({ error: null })

    try {
      const response = await apiClient.updateCategory(id, categoryData)

      if (response.success && response.data) {
        const updatedCategory = response.data
        set((state) => ({
          categories: state.categories.map((cat) => (cat.id === id ? updatedCategory : cat)),
        }))
        return updatedCategory
      } else {
        throw new Error(response.error || "Failed to update category")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update category"
      set({ error: errorMessage })
      throw error
    }
  },

  deleteCategory: async (id: string) => {
    set({ error: null })

    try {
      const response = await apiClient.deleteCategory(id)

      if (response.success) {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        }))
      } else {
        throw new Error(response.error || "Failed to delete category")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete category"
      set({ error: errorMessage })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
