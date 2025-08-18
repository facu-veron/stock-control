/* // prisma/seed.ts
import { PrismaClient, Prisma, Role, AfipMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface CategoryData {
  name: string;
  description: string;
  color: string;
}

interface SupplierData {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}

interface ProductData {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  ivaRate?: number;
  active: boolean;
}

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed de la base de datos (multitenant + FKs compuestas)...");

  // 1) Tenant (cuit es único)
  const tenant = await prisma.tenant.upsert({
    where: { cuit: "23415422229" },
    update: {},
    create: {
      name: "Tenant Demo",
      cuit: "23415422229",
      mode: AfipMode.HOMOLOGACION,
    },
  });
  const tenantId = tenant.id;
  console.log("🏢 Tenant:", tenant.name, tenant.cuit);

  // 2) Users (upsert por clave compuesta [tenantId, email])
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "admin@inventario.com" } },
    update: {},
    create: {
      tenantId,
      email: "admin@inventario.com",
      name: "Administrador",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const employeePassword = await bcrypt.hash("empleado123", 12);
  const employee = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "empleado@inventario.com" } },
    update: {},
    create: {
      tenantId,
      email: "empleado@inventario.com",
      name: "Empleado Demo",
      password: employeePassword,
      role: Role.EMPLOYEE,
      pin: "1234", // PIN único por tenant
    },
  });

  console.log("✅ Usuarios:", admin.email, employee.email);

  // 3) Categorías (upsert por [tenantId, name])
  const categories: CategoryData[] = [
    { name: "Electrónicos", description: "Dispositivos y tecnología", color: "#3b82f6" },
    { name: "Ropa",         description: "Prendas de vestir",        color: "#ef4444" },
    { name: "Hogar",        description: "Hogar y decoración",       color: "#10b981" },
    { name: "Deportes",     description: "Equipamiento deportivo",   color: "#f59e0b" },
    { name: "Libros",       description: "Libros y educativos",      color: "#8b5cf6" },
  ];

  const createdCategories: { id: string; name: string }[] = [];
  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { tenantId_name: { tenantId, name: c.name } },
      update: { description: c.description, color: c.color },
      create: { tenantId, ...c },
    });
    createdCategories.push({ id: category.id, name: category.name });
    console.log("✅ Categoría:", category.name);
  }

  // 4) Proveedores (upsert por [tenantId, name])
  const suppliers: SupplierData[] = [
    { name: "TechSupply SA",    contact: "Juan Pérez",       email: "contacto@techsupply.com",  phone: "+54 11 4567-8901" },
    { name: "Fashion World",    contact: "María González",   email: "ventas@fashionworld.com",  phone: "+54 11 4567-8902" },
    { name: "Home & Deco",      contact: "Carlos Rodríguez", email: "info@homedeco.com",        phone: "+54 11 4567-8903" },
    { name: "Sports Pro",       contact: "Ana Martínez",     email: "pedidos@sportspro.com",     phone: "+54 11 4567-8904" },
    { name: "Editorial Libros", contact: "Roberto Silva",    email: "editorial@libros.com",      phone: "+54 11 4567-8905" },
  ];

  const createdSuppliers: { id: string; name: string }[] = [];
  for (const s of suppliers) {
    const supplier = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId, name: s.name } },
      update: { contact: s.contact, email: s.email, phone: s.phone },
      create: { tenantId, ...s },
    });
    createdSuppliers.push({ id: supplier.id, name: supplier.name });
    console.log("✅ Proveedor:", supplier.name);
  }

  // 5) Tags por tenant (upsert por [tenantId, name])
  const tagNames = ["Nuevo", "Oferta", "Destacado", "Liquidación", "Premium", "Eco-friendly", "Importado", "Nacional"];
  const createdTags: { id: string; name: string }[] = [];
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
    });
    createdTags.push({ id: tag.id, name: tag.name });
  }
  console.log("🏷️ Tags:", createdTags.map(t => t.name).join(", "));

  // 6) Productos (y asociaciones ProductTag explícitas)
  const products: ProductData[] = [
    {
      name: "iPhone 15 Pro",
      description: "Apple iPhone 15 Pro 128GB",
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
      description: "Samsung Galaxy S24 256GB",
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
  ];

  const categorySupplierMapping = [
    { categoryIndex: 0, supplierIndex: 0 }, // Electrónicos - TechSupply
    { categoryIndex: 0, supplierIndex: 0 }, // Electrónicos - TechSupply
    { categoryIndex: 1, supplierIndex: 1 }, // Ropa - Fashion World
    { categoryIndex: 2, supplierIndex: 2 }, // Hogar - Home & Deco
    { categoryIndex: 3, supplierIndex: 3 }, // Deportes - Sports Pro
    { categoryIndex: 4, supplierIndex: 4 }, // Libros - Editorial Libros
  ];

  const tagNuevo = createdTags.find(t => t.name === "Nuevo")!;
  const tagDestacado = createdTags.find(t => t.name === "Destacado")!;

  for (let i = 0; i < products.length; i++) {
    const category = createdCategories[categorySupplierMapping[i].categoryIndex];
    const supplier = createdSuppliers[categorySupplierMapping[i].supplierIndex];

    const product = await prisma.product.create({
      data: {
        tenantId,
        ...products[i],
        categoryId: category.id,
        supplierId: supplier.id,
      },
    });

    // Asociaciones explícitas Product ↔ Tag (mismo tenantId)
    await prisma.productTag.createMany({
      data: [
        { tenantId, productId: product.id, tagId: tagNuevo.id },
        { tenantId, productId: product.id, tagId: tagDestacado.id },
      ],
      skipDuplicates: true,
    });

    console.log("📦 Producto:", product.name);
  }

  console.log("\n🎉 Seed completado!");
  console.log("📧 Credenciales:");
  console.log("   Admin:    admin@inventario.com / admin123");
  console.log("   Empleado: empleado@inventario.com / empleado123");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 */


















  // prisma/seed.ts
import {
  PrismaClient,
  Prisma,
  Role,
  AfipMode,
  BillingInterval,
  PaymentProcessor,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface CategoryData {
  name: string;
  description: string;
  color: string;
}
interface SupplierData {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
}
interface ProductData {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  price: Prisma.Decimal;
  cost: Prisma.Decimal;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  ivaRate?: Prisma.Decimal;
  active: boolean;
}

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed (multitenant + billing + pinHash + decimal)…");

  // 1) Tenant (usa un nombre que puedas reutilizar como subdominio si querés)
  const tenant = await prisma.tenant.upsert({
    where: { cuit: "23415422229" },
    update: {},
    create: {
      name: "tenant-demo",
      cuit: "23415422229",
      mode: AfipMode.HOMOLOGACION,
    },
  });
  const tenantId = tenant.id;
  console.log("🏢 Tenant:", tenant.name, tenant.cuit);

  // 2) Usuarios (email único por tenant). PIN guardado como hash (bcrypt).
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "admin@inventario.com" } },
    update: {},
    create: {
      tenantId,
      email: "admin@inventario.com",
      name: "Administrador",
      password: adminPasswordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  const employeePasswordHash = await bcrypt.hash("empleado123", 12);
  const employeePinHash = await bcrypt.hash("1234", 12); // PIN demo
  const employee = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: "empleado@inventario.com" } },
    update: {},
    create: {
      tenantId,
      email: "empleado@inventario.com",
      name: "Empleado Demo",
      password: employeePasswordHash,
      role: Role.EMPLOYEE,
      pinHash: employeePinHash, // 👈 guardamos hash, NO el PIN en claro
      active: true,
    },
  });
  console.log("✅ Usuarios:", admin.email, employee.email);

  // 3) Billing – planes y precios globales (no por tenant)
  const planBasic = await prisma.plan.upsert({
    where: { code: "BASIC" },
    update: {},
    create: { code: "BASIC", name: "Basic", description: "Plan básico" },
  });
  const planPro = await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {},
    create: { code: "PRO", name: "Pro", description: "Plan profesional" },
  });
  const planLT = await prisma.plan.upsert({
    where: { code: "LIFETIME" },
    update: {},
    create: { code: "LIFETIME", name: "Lifetime", description: "Pago único" },
  });

  const D = Prisma.Decimal; // alias
  const prices = [
    { planId: planBasic.id, interval: BillingInterval.MONTH, amount: new D("4999.00"), currency: "ARS" },
    { planId: planBasic.id, interval: BillingInterval.YEAR,  amount: new D("49990.00"), currency: "ARS" },
    { planId: planPro.id,   interval: BillingInterval.MONTH, amount: new D("9999.00"), currency: "ARS" },
    { planId: planPro.id,   interval: BillingInterval.YEAR,  amount: new D("99990.00"), currency: "ARS" },
    { planId: planLT.id,    interval: BillingInterval.ONE_TIME, amount: new D("149990.00"), currency: "ARS" },
  ];
  // upsert naive: si no existe precio con ese triplete, lo creamos
  for (const p of prices) {
    const found = await prisma.price.findFirst({
      where: { planId: p.planId, interval: p.interval, currency: p.currency },
      select: { id: true },
    });
    if (!found) {
      await prisma.price.create({
        data: { ...p, processor: PaymentProcessor.OTHER },
      });
    }
  }
  console.log("💳 Billing: planes y precios listos");

  // 4) Categorías (por tenant)
  const categories: CategoryData[] = [
    { name: "Electrónicos", description: "Dispositivos y tecnología", color: "#3b82f6" },
    { name: "Ropa",         description: "Prendas de vestir",        color: "#ef4444" },
    { name: "Hogar",        description: "Hogar y decoración",       color: "#10b981" },
    { name: "Deportes",     description: "Equipamiento deportivo",   color: "#f59e0b" },
    { name: "Libros",       description: "Libros y educativos",      color: "#8b5cf6" },
  ];
  const createdCategories: { id: string; name: string }[] = [];
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { tenantId_name: { tenantId, name: c.name } },
      update: { description: c.description, color: c.color },
      create: { tenantId, ...c },
    });
    createdCategories.push({ id: cat.id, name: cat.name });
    console.log("📁 Categoría:", cat.name);
  }

  // 5) Proveedores (por tenant)
  const suppliers: SupplierData[] = [
    { name: "TechSupply SA",    contact: "Juan Pérez",       email: "contacto@techsupply.com",  phone: "+54 11 4567-8901" },
    { name: "Fashion World",    contact: "María González",   email: "ventas@fashionworld.com",  phone: "+54 11 4567-8902" },
    { name: "Home & Deco",      contact: "Carlos Rodríguez", email: "info@homedeco.com",        phone: "+54 11 4567-8903" },
    { name: "Sports Pro",       contact: "Ana Martínez",     email: "pedidos@sportspro.com",     phone: "+54 11 4567-8904" },
    { name: "Editorial Libros", contact: "Roberto Silva",    email: "editorial@libros.com",      phone: "+54 11 4567-8905" },
  ];
  const createdSuppliers: { id: string; name: string }[] = [];
  for (const s of suppliers) {
    const sup = await prisma.supplier.upsert({
      where: { tenantId_name: { tenantId, name: s.name } },
      update: { contact: s.contact, email: s.email, phone: s.phone },
      create: { tenantId, ...s },
    });
    createdSuppliers.push({ id: sup.id, name: sup.name });
    console.log("🏢 Proveedor:", sup.name);
  }

  // 6) Tags por tenant
  const tagNames = ["Nuevo", "Oferta", "Destacado", "Liquidación", "Premium", "Eco-friendly", "Importado", "Nacional"];
  const createdTags: { id: string; name: string }[] = [];
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
    });
    createdTags.push({ id: tag.id, name: tag.name });
  }
  const tagNuevo = createdTags.find(t => t.name === "Nuevo")!;
  const tagDestacado = createdTags.find(t => t.name === "Destacado")!;
  console.log("🏷️ Tags:", createdTags.map(t => t.name).join(", "));

  // 7) Productos (por tenant) con Decimal
  const products: ProductData[] = [
    {
      name: "iPhone 15 Pro",
      description: "Apple iPhone 15 Pro 128GB",
      sku: "IPH15P-128",
      barcode: "1234567890123",
      price: new D("999.99"),
      cost: new D("750.00"),
      stock: 25, minStock: 5, maxStock: 100, unit: "unidad",
      brand: "Apple", color: "Titanio Natural", size: "6.1 pulgadas", material: "Titanio",
      ivaRate: new D("21.00"), active: true,
    },
    {
      name: "Samsung Galaxy S24",
      description: "Samsung Galaxy S24 256GB",
      sku: "SGS24-256",
      barcode: "1234567890124",
      price: new D("849.99"),
      cost: new D("650.00"),
      stock: 30, minStock: 5, maxStock: 80, unit: "unidad",
      brand: "Samsung", color: "Negro Fantasma", size: "6.2 pulgadas", material: "Aluminio",
      ivaRate: new D("21.00"), active: true,
    },
    {
      name: "Camiseta Nike",
      description: "Camiseta deportiva Nike Dri-FIT",
      sku: "NIKE-SHIRT-001",
      barcode: "1234567890125",
      price: new D("29.99"),
      cost: new D("15.00"),
      stock: 50, minStock: 10, maxStock: 200, unit: "unidad",
      brand: "Nike", color: "Azul", size: "M", material: "Poliéster",
      ivaRate: new D("21.00"), active: true,
    },
    {
      name: "Lámpara LED",
      description: "Lámpara LED de escritorio regulable",
      sku: "LAMP-LED-001",
      barcode: "1234567890126",
      price: new D("45.99"),
      cost: new D("25.00"),
      stock: 15, minStock: 3, maxStock: 50, unit: "unidad",
      brand: "Philips", color: "Blanco", size: "30cm", material: "Plástico",
      ivaRate: new D("21.00"), active: true,
    },
    {
      name: "Pelota de Fútbol",
      description: "Pelota de fútbol profesional FIFA",
      sku: "BALL-FIFA-001",
      barcode: "1234567890127",
      price: new D("35.99"),
      cost: new D("20.00"),
      stock: 20, minStock: 5, maxStock: 100, unit: "unidad",
      brand: "Adidas", color: "Blanco/Negro", size: "Talla 5", material: "Cuero sintético",
      ivaRate: new D("21.00"), active: true,
    },
    {
      name: "El Quijote",
      description: "Don Quijote de la Mancha - Edición completa",
      sku: "BOOK-QUIJOTE",
      barcode: "1234567890128",
      price: new D("19.99"),
      cost: new D("10.00"),
      stock: 8, minStock: 2, maxStock: 30, unit: "unidad",
      brand: "Editorial Planeta", color: "Multicolor", size: "15x23cm", material: "Papel",
      ivaRate: new D("10.50"), active: true,
    },
  ];

  const mapping = [
    { c: 0, s: 0 }, // iPhone -> Electrónicos / TechSupply
    { c: 0, s: 0 }, // S24    -> Electrónicos / TechSupply
    { c: 1, s: 1 }, // Nike   -> Ropa / Fashion World
    { c: 2, s: 2 }, // Lámpara-> Hogar / Home & Deco
    { c: 3, s: 3 }, // Pelota -> Deportes / Sports Pro
    { c: 4, s: 4 }, // Quijote-> Libros / Editorial Libros
  ];

  for (let i = 0; i < products.length; i++) {
    const category = createdCategories[mapping[i].c];
    const supplier = createdSuppliers[mapping[i].s];

    const product = await prisma.product.create({
      data: {
        tenantId,
        ...products[i],
        categoryId: category.id,
        supplierId: supplier.id,
      },
    });

    // Tags "Nuevo" y "Destacado"
    await prisma.productTag.createMany({
      data: [
        { tenantId, productId: product.id, tagId: tagNuevo.id },
        { tenantId, productId: product.id, tagId: tagDestacado.id },
      ],
      skipDuplicates: true,
    });

    console.log("📦 Producto:", product.name);
  }

  console.log("\n🎉 Seed completado!");
  console.log("Credenciales:");
  console.log("  Admin:    admin@inventario.com / admin123");
  console.log("  Empleado: empleado@inventario.com / empleado123 (PIN 1234)");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
