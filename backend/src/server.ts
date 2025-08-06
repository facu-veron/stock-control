import express, { type Application } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

// Cargar variables de entorno
dotenv.config()

// Importar rutas
import categoryRoutes from "./routes/categories"
import productRoutes from "./routes/products"
import authRoutes from "./routes/auth"
import employeeRoutes from "./routes/employees"
import suppliersRoutes from "./routes/suppliers" // Por implementar

// Middleware de manejo de errores
import errorHandler from "./middleware/errorHandler"

const app: Application = express()
const PORT = process.env.PORT || 3001
const prisma = new PrismaClient()

// Middleware global
app.use(helmet())
app.use(morgan("combined"))
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Rutas
app.use("/api/auth", authRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/products", productRoutes)
app.use("/api/employees", employeeRoutes)
app.use("/api/suppliers", suppliersRoutes) // Por implementar

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  })
})

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler)

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.originalUrl,
  })
})

// Iniciar servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    await prisma.$connect()
    console.log("✅ Conectado a la base de datos")

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
      console.log(`📊 Prisma Studio: npx prisma studio`)
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`)
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error)
    process.exit(1)
  }
}

// Manejo de cierre graceful
process.on("SIGINT", async () => {
  console.log("\n🔄 Cerrando servidor...")
  await prisma.$disconnect()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("\n🔄 Cerrando servidor...")
  await prisma.$disconnect()
  process.exit(0)
})

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error)
  process.exit(1)
})

startServer()

export default app
