import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

interface CategoryData {
  name: string
  description: string
  color: string
}

interface SupplierData {
  name: string
  contact?: string
  email?: string
  phone?: string
}

interface TagData {
  name: string
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
  supplierId?: string
  brand?: string
  color?: string
  size?: string
  material?: string
  ivaRate?: number
  active: boolean
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
      pin: "1234", // PIN para validación rápida en punto de venta
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

    // Crear proveedores
    const suppliers: SupplierData[] = [
      {
        name: "TechSupply SA",
        contact: "Juan Pérez",
        email: "contacto@techsupply.com",
        phone: "+54 11 4567-8901",
      },
      {
        name: "Fashion World",
        contact: "María González",
        email: "ventas@fashionworld.com",
        phone: "+54 11 4567-8902",
      },
      {
        name: "Home & Deco",
        contact: "Carlos Rodríguez",
        email: "info@homedeco.com",
        phone: "+54 11 4567-8903",
      },
      {
        name: "Sports Pro",
        contact: "Ana Martínez",
        email: "pedidos@sportspro.com",
        phone: "+54 11 4567-8904",
      },
      {
        name: "Editorial Libros",
        contact: "Roberto Silva",
        email: "editorial@libros.com",
        phone: "+54 11 4567-8905",
      },
    ]

    const createdSuppliers = []
    for (const supplierData of suppliers) {
      const supplier = await prisma.supplier.upsert({
        where: { name: supplierData.name },
        update: {},
        create: supplierData,
      })
      createdSuppliers.push(supplier)
      console.log("✅ Proveedor creado:", supplier.name)
    }

    // Crear etiquetas
    const tags: TagData[] = [
      { name: "Nuevo" },
      { name: "Oferta" },
      { name: "Destacado" },
      { name: "Liquidación" },
      { name: "Premium" },
      { name: "Eco-friendly" },
      { name: "Importado" },
      { name: "Nacional" },
    ]

    const createdTags = []
    for (const tagData of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagData.name },
        update: {},
        create: tagData,
      })
      createdTags.push(tag)
      console.log("✅ Etiqueta creada:", tag.name)
    }

    // Crear productos
    const products: Omit<ProductData, "categoryId" | "supplierId">[] = [
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
        brand: "Apple",
        color: "Titanio Natural",
        size: "6.1 pulgadas",
        material: "Titanio",
        ivaRate: 21.0,
        active: true,
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
        brand: "Samsung",
        color: "Negro Fantasma",
        size: "6.2 pulgadas",
        material: "Aluminio",
        ivaRate: 21.0,
        active: true,
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
        brand: "Nike",
        color: "Azul",
        size: "M",
        material: "Poliéster",
        ivaRate: 21.0,
        active: true,
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
        brand: "Philips",
        color: "Blanco",
        size: "30cm",
        material: "Plástico",
        ivaRate: 21.0,
        active: true,
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
        brand: "Adidas",
        color: "Blanco/Negro",
        size: "Talla 5",
        material: "Cuero sintético",
        ivaRate: 21.0,
        active: true,
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
        brand: "Editorial Planeta",
        color: "Multicolor",
        size: "15x23cm",
        material: "Papel",
        ivaRate: 10.5,
        active: true,
      },
    ]

    const categorySupplierMapping = [
      { categoryIndex: 0, supplierIndex: 0 }, // Electrónicos - TechSupply
      { categoryIndex: 0, supplierIndex: 0 }, // Electrónicos - TechSupply
      { categoryIndex: 1, supplierIndex: 1 }, // Ropa - Fashion World
      { categoryIndex: 2, supplierIndex: 2 }, // Hogar - Home & Deco
      { categoryIndex: 3, supplierIndex: 3 }, // Deportes - Sports Pro
      { categoryIndex: 4, supplierIndex: 4 }, // Libros - Editorial Libros
    ]

    for (let i = 0; i < products.length; i++) {
      const productData: ProductData = {
        ...products[i],
        categoryId: createdCategories[categorySupplierMapping[i].categoryIndex].id,
        supplierId: createdSuppliers[categorySupplierMapping[i].supplierIndex].id,
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          tags: {
            connect: [
              { id: createdTags[0].id }, // Nuevo
              { id: createdTags[2].id }, // Destacado
            ],
          },
        },
      })
      console.log("✅ Producto creado:", product.name)
    }

    console.log("🎉 Seed completado exitosamente!")
    console.log("\n📧 Credenciales de acceso:")
    console.log("👨‍💼 Admin: admin@inventario.com / admin123")
    console.log("👤 Empleado: empleado@inventario.com / empleado123")
    console.log("\n📊 Datos creados:")
    console.log(`📁 ${createdCategories.length} categorías`)
    console.log(`🏢 ${createdSuppliers.length} proveedores`)
    console.log(`🏷️ ${createdTags.length} etiquetas`)
    console.log(`📦 ${products.length} productos`)
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
