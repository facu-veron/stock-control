import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { toast } from "@/components/ui/use-toast"
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier, type Supplier } from "@/lib/api"

interface SuppliersState {
  suppliers: Supplier[]
  isLoading: boolean
  error: string | null
}

interface SuppliersActions {
  fetchSuppliers: () => Promise<void>
  fetchSupplierById: (id: string) => Promise<Supplier | null>
  createSupplier: (data: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  clearError: () => void
}

type SuppliersStore = SuppliersState & SuppliersActions

export const useSuppliersStore = create<SuppliersStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      suppliers: [],
      isLoading: false,
      error: null,

      // Acciones
      fetchSuppliers: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getSuppliers()
          set({ suppliers: data, isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar proveedores"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }
      },

      fetchSupplierById: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const supplier = await getSupplierById(id)
          set({ isLoading: false })
          return supplier
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cargar el proveedor"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }
      },

      createSupplier: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const newSupplier = await createSupplier(data)
          set((state) => ({
            suppliers: [...state.suppliers, newSupplier],
            isLoading: false,
          }))
          toast({
            title: "Proveedor creado",
            description: `El proveedor "${data.name}" ha sido creado exitosamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al crear proveedor"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al crear proveedor",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      updateSupplier: async (id, data) => {
        set({ isLoading: true, error: null })
        try {
          const updatedSupplier = await updateSupplier(id, data)
          set((state) => ({
            suppliers: state.suppliers.map((s) => (s.id === id ? updatedSupplier : s)),
            isLoading: false,
          }))
          toast({
            title: "Proveedor actualizado",
            description: `El proveedor "${updatedSupplier.name}" ha sido actualizado correctamente.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al actualizar proveedor"
          set({ error: errorMessage, isLoading: false })
          toast({
            title: "Error al actualizar",
            description: errorMessage,
            variant: "destructive",
          })
          throw error
        }
      },

      deleteSupplier: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await deleteSupplier(id)
          set((state) => ({
            suppliers: state.suppliers.filter((s) => s.id !== id),
            isLoading: false,
          }))
          toast({
            title: "Proveedor eliminado",
            description: "El proveedor ha sido eliminado correctamente.",
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al eliminar proveedor"
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
      name: "suppliers-store",
    },
  ),
)
