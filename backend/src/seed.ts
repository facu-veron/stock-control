import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

interface CategoryData {
  name: string
  description: string
  color: string
}

interface ProductData {
  name: string
  description: string
  sku: string
  barcode: string
  price: number
  cost: number
  stock: number
  minStock: number
  maxStock: number
  unit: string
  categoryId: string
}

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed de la base de datos...")

  try {
    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash("admin123", 12)

    const admin = await prisma.user.upsert({
      where: { email: "admin@inventario.com" },
      update: {},
      create: {
        email: "admin@inventario.com",
        name: "Administrador",
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    console.log("✅ Usuario administrador creado:", admin.email)

    // Crear empleado de ejemplo
    const employeePassword = await bcrypt.hash("empleado123", 12)

    const employee = await prisma.user.upsert({
      where: { email: "empleado@inventario.com" },
      update: {},
      create: {
        email: "empleado@inventario.com",
        name: "Empleado Demo",
        password: employeePassword,
        role: "EMPLOYEE",
      },
    })

    console.log("✅ Usuario empleado creado:", employee.email)

    // Crear categorías
    const categories: CategoryData[] = [
      {
        name: "Electrónicos",
        description: "Dispositivos electrónicos y tecnología",
        color: "#3b82f6",
      },
      {
        name: "Ropa",
        description: "Prendas de vestir y accesorios",
        color: "#ef4444",
      },
      {
        name: "Hogar",
        description: "Artículos para el hogar y decoración",
        color: "#10b981",
      },
      {
        name: "Deportes",
        description: "Equipamiento deportivo y fitness",
        color: "#f59e0b",
      },
      {
        name: "Libros",
        description: "Libros y material educativo",
        color: "#8b5cf6",
      },
    ]

    const createdCategories = []
    for (const categoryData of categories) {
      const category = await prisma.category.upsert({
        where: { name: categoryData.name },
        update: {},
        create: categoryData,
      })
      createdCategories.push(category)
      console.log("✅ Categoría creada:", category.name)
    }

    // Crear productos
    const products: Omit<ProductData, "categoryId">[] = [
      {
        name: "iPhone 15 Pro",
        description: "Smartphone Apple iPhone 15 Pro 128GB",
        sku: "IPH15P-128",
        barcode: "1234567890123",
        price: 999.99,
        cost: 750.0,
        stock: 25,
        minStock: 5,
        maxStock: 100,
        unit: "unidad",
      },
      {
        name: "Samsung Galaxy S24",
        description: "Smartphone Samsung Galaxy S24 256GB",
        sku: "SGS24-256",
        barcode: "1234567890124",
        price: 849.99,
        cost: 650.0,
        stock: 30,
        minStock: 5,
        maxStock: 80,
        unit: "unidad",
      },
      {
        name: "Camiseta Nike",
        description: "Camiseta deportiva Nike Dri-FIT",
        sku: "NIKE-SHIRT-001",
        barcode: "1234567890125",
        price: 29.99,
        cost: 15.0,
        stock: 50,
        minStock: 10,
        maxStock: 200,
        unit: "unidad",
      },
      {
        name: "Lámpara LED",
        description: "Lámpara LED de escritorio regulable",
        sku: "LAMP-LED-001",
        barcode: "1234567890126",
        price: 45.99,
        cost: 25.0,
        stock: 15,
        minStock: 3,
        maxStock: 50,
        unit: "unidad",
      },
      {
        name: "Pelota de Fútbol",
        description: "Pelota de fútbol profesional FIFA",
        sku: "BALL-FIFA-001",
        barcode: "1234567890127",
        price: 35.99,
        cost: 20.0,
        stock: 20,
        minStock: 5,
        maxStock: 100,
        unit: "unidad",
      },
      {
        name: "El Quijote",
        description: "Don Quijote de la Mancha - Edición completa",
        sku: "BOOK-QUIJOTE",
        barcode: "1234567890128",
        price: 19.99,
        cost: 10.0,
        stock: 8,
        minStock: 2,
        maxStock: 30,
        unit: "unidad",
      },
    ]

    const categoryIds = [
      createdCategories[0].id, // Electrónicos
      createdCategories[0].id, // Electrónicos
      createdCategories[1].id, // Ropa
      createdCategories[2].id, // Hogar
      createdCategories[3].id, // Deportes
      createdCategories[4].id, // Libros
    ]

    for (let i = 0; i < products.length; i++) {
      const productData: ProductData = {
        ...products[i],
        categoryId: categoryIds[i],
      }

      const product = await prisma.product.upsert({
        where: { sku: productData.sku },
        update: {},
        create: productData,
      })
      console.log("✅ Producto creado:", product.name)
    }

    console.log("🎉 Seed completado exitosamente!")
    console.log("\n📧 Credenciales de acceso:")
    console.log("👨‍💼 Admin: admin@inventario.com / admin123")
    console.log("👤 Empleado: empleado@inventario.com / empleado123")
  } catch (error) {
    console.error("❌ Error durante el seed:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
