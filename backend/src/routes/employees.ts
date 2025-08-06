import { Router } from "express"
import { PrismaClient, Role } from "@prisma/client"
import { authenticateToken } from "../middleware/auth"
import type { AuthenticatedRequest } from "../types"

const prisma = new PrismaClient()
const router = Router()

// Listar empleados
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: Role.EMPLOYEE },
      orderBy: { createdAt: "desc" },
    })
    res.json({ success: true, data: employees })
  } catch (error) {
    console.error("Error al listar empleados:", error)
    res.status(500).json({ success: false, error: "Error interno al obtener empleados" })
  }
})

// Crear empleado
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { name, email, password, pin } = req.body

  try {
    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        password, // Asegurate de hashear en producción
        pin,
        role: Role.EMPLOYEE,
      },
    })
    res.status(201).json({ success: true, data: newEmployee })
  } catch (error) {
    console.error("Error al crear empleado:", error)
    res.status(500).json({ success: false, error: "Error al crear empleado" })
  }
})

export default router
