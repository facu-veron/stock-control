// routes/customers.ts
import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import type { AuthenticatedRequest } from "../types"
import type { CreateCustomerRequest, UpdateCustomerRequest } from "../types"
import { authenticateToken, requireRole } from "../middleware/auth"

const prisma = new PrismaClient()
const router = Router()

// Listar todos los clientes
router.get("/", authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    })
    res.json({ success: true, data: customers })
  } catch (error) {
    console.error("Error fetching customers:", error)
    res.status(500).json({ success: false, error: "Failed to fetch customers" })
  }
})

// Obtener un cliente por ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params
  try {
    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" })
    }

    return res.json({ success: true, data: customer }) // 👈 return explícito
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to fetch customer" }) // 👈 return explícito
  }
})

// Crear cliente
router.post("/", authenticateToken, requireRole(["ADMIN"])
, async (req: AuthenticatedRequest, res) => {
  const data = req.body as CreateCustomerRequest
  try {
    const created = await prisma.customer.create({ data })
    res.status(201).json({ success: true, data: created })
  } catch (error) {
    console.error("Error creating customer:", error)
    res.status(500).json({ success: false, error: "Failed to create customer" })
  }
})

// Actualizar cliente
router.put("/:id", authenticateToken, requireRole(["ADMIN"])
, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const data = req.body as UpdateCustomerRequest
  try {
    const updated = await prisma.customer.update({ where: { id }, data })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating customer:", error)
    res.status(500).json({ success: false, error: "Failed to update customer" })
  }
})

// Eliminar cliente
router.delete("/:id", authenticateToken, requireRole(["ADMIN"])
, async (req, res) => {
  const { id } = req.params
  try {
    await prisma.customer.delete({ where: { id } })
    res.json({ success: true, message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    res.status(500).json({ success: false, error: "Failed to delete customer" })
  }
})



export default router
