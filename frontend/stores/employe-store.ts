import { create } from "zustand"
import { apiClient, type User, type CreateEmployeeRequest, type UpdateEmployeeRequest } from "@/lib/api"

interface EmployeesState {
  employees: User[]
  isLoading: boolean
  error: string | null
}

interface EmployeesActions {
  fetchEmployees: () => Promise<void>
  createEmployee: (employee: CreateEmployeeRequest) => Promise<void>
  updateEmployee: (id: string, employee: UpdateEmployeeRequest) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  verifyPin: (pin: string) => Promise<User | null>
  clearError: () => void
}

type EmployeesStore = EmployeesState & EmployeesActions

export const useEmployeesStore = create<EmployeesStore>((set, get) => ({
  // State
  employees: [],
  isLoading: false,
  error: null,

  // Actions
  fetchEmployees: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.getEmployees()

      if (response.success && response.data) {
        set({
          employees: response.data,
          isLoading: false,
        })
      } else {
        throw new Error(response.error || "Failed to fetch employees")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch employees",
        isLoading: false,
      })
    }
  },

  createEmployee: async (employee: CreateEmployeeRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.createEmployee(employee)

      if (response.success && response.data) {
        set((state) => ({
          employees: [...state.employees, response.data!],
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to create employee")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create employee",
        isLoading: false,
      })
      throw error
    }
  },

  updateEmployee: async (id: string, employee: UpdateEmployeeRequest) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.updateEmployee(id, employee)

      if (response.success && response.data) {
        set((state) => ({
          employees: state.employees.map((emp) => (emp.id === id ? response.data! : emp)),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to update employee")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update employee",
        isLoading: false,
      })
      throw error
    }
  },

  deleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.deleteEmployee(id)

      if (response.success) {
        set((state) => ({
          employees: state.employees.filter((emp) => emp.id !== id),
          isLoading: false,
        }))
      } else {
        throw new Error(response.error || "Failed to delete employee")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete employee",
        isLoading: false,
      })
      throw error
    }
  },

  verifyPin: async (pin: string) => {
    try {
      const response = await apiClient.verifyEmployeePin(pin)

      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.error || "Invalid PIN")
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Invalid PIN",
      })
      return null
    }
  },

  clearError: () => set({ error: null }),
}))
