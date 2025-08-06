import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { toast } from "@/components/ui/use-toast"
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type User, // Using User type for employees
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from "@/lib/api"

interface EmployeesState {
  employees: User[]
  isLoading: boolean
  error: string | null
}

interface EmployeesActions {
  fetchEmployees: () => Promise<void>
  fetchEmployeeById: (id: string) => Promise<User | null>
  createEmployee: (data: CreateEmployeeRequest) => Promise<void>
  updateEmployee: (id: string, data: UpdateEmployeeRequest) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  clearError: () => void
}

type EmployeesStore = EmployeesState & EmployeesActions

export const useEmployeesStore = create<EmployeesStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      employees: [],
      isLoading: false,
      error: null,

      // Acciones
      fetchEmployees: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getEmployees()
          set({ employees: data, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar empleados"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      },

      fetchEmployeeById: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const employee = await getEmployeeById(id)
          set({ isLoading: false })
          return employee
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar el empleado"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }
      },

      createEmployee: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newEmployee = await createEmployee(data)
          set((state) => ({
            employees: [...state.employees, newEmployee],
            isLoading: false,
          }))
          toast({
            title: "Empleado creado",
            description: `El empleado "${data.name}" ha sido creado exitosamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al crear empleado"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al crear empleado",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      updateEmployee: async (id, data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedEmployee = await updateEmployee(id, data)
          set((state) => ({
            employees: state.employees.map((e) => (e.id === id ? updatedEmployee : e)),
            isLoading: false,
          }))
          toast({
            title: "Empleado actualizado",
            description: `El empleado "${updatedEmployee.name}" ha sido actualizado correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al actualizar empleado"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al actualizar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      deleteEmployee: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await deleteEmployee(id)
          set((state) => ({
            employees: state.employees.filter((e) => e.id !== id),
            isLoading: false,
          }))
          toast({
            title: "Empleado eliminado",
            description: "El empleado ha sido eliminado correctamente.",
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al eliminar empleado"
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
      name: "employees-store",
    },
  ),
)
