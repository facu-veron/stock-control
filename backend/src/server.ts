// src/server.ts
import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import http from "http";
import https from "https";
import fs from "fs";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Cargar variables de entorno
dotenv.config();

// Importar rutas
import categoryRoutes from "./routes/categories";
import productRoutes from "./routes/products";
import authRoutes from "./routes/auth";
import employeeRoutes from "./routes/employees";
import suppliersRoutes from "./routes/suppliers";
import salesRoutes from "./routes/sales";
import customersRoutes from "./routes/customers";

// Importar rutas AFIP
import afipConfigRoutes from "./routes/afip-config";

// Middleware de manejo de errores
import errorHandler from "./middleware/errorHandler";

// Tipos extendidos para multitenant
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      id?: string; // <-- Agregado para request ID
    }
  }
}

class Server {
  private app: Application;
  private server: http.Server | null = null;
  private prisma: PrismaClient;
  private readonly PORT: number;
  private readonly isProduction: boolean;
  private shutdownInProgress = false;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "3001", 10);
    this.isProduction = process.env.NODE_ENV === "production";
    this.prisma = new PrismaClient({
      log: this.isProduction ? ["error"] : ["query", "error", "warn"],
    });

    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddleware(): void {
    // Seguridad básica
    this.app.use(helmet({
      contentSecurityPolicy: this.isProduction ? undefined : false,
    }));

    // Rate limiting por tenant
    const createTenantRateLimiter = (windowMs: number, max: number) => {
      return rateLimit({
        windowMs,
        max,
        keyGenerator: (req: Request) => {
          const tenantId = req.headers["x-tenant-id"] || "default";
          // 🔑 Usa el ipKeyGenerator oficial
          return `${tenantId}:${ipKeyGenerator(req.ip || "")}`;        
        },
        message: "Demasiadas solicitudes, por favor intente más tarde",
        standardHeaders: true,
        legacyHeaders: false,
      });
    };
    
    // Rate limiting general
    if (this.isProduction) {
      this.app.use(createTenantRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 min per tenant
      // Rate limiting estricto para auth
      this.app.use("/api/auth", createTenantRateLimiter(15 * 60 * 1000, 5)); // 5 auth attempts per 15 min
    }

    // Logging
    if (this.isProduction) {
      this.app.use(morgan("combined"));
    } else {
      this.app.use(morgan("dev"));
    }

    // CORS configurado para multitenant
    this.app.use(
      cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (this.isProduction) {
            const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("No permitido por CORS"), false);
            }
          } else {
            callback(null, true);
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
      })
    );
    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Middleware para extraer tenant ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers["x-tenant-id"] as string;
      if (tenantId) {
        req.tenantId = tenantId;
      }
      next();
    });

    // Request ID para tracking
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = req.headers["x-request-id"] as string || 
               `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader("X-Request-Id", req.id);
      next();
    });
  }

  private configureRoutes(): void {
    // Health check con información del sistema
    this.app.get("/api/health", async (req: Request, res: Response) => {
      try {
        // Verificar conexión a BD
        await this.prisma.$queryRaw`SELECT 1`;
        
        const healthInfo = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          version: process.env.APP_VERSION || "1.0.0",
          uptime: process.uptime(),
          database: "connected",
          services: {
            afip: "enabled",
          },
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
          },
        };

        res.json(healthInfo);
      } catch (error) {
        res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Database connection failed",
        });
      }
    });

    // Rutas de la aplicación
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/categories", categoryRoutes);
    this.app.use("/api/products", productRoutes);
    this.app.use("/api/employees", employeeRoutes);
    this.app.use("/api/suppliers", suppliersRoutes);
    this.app.use("/api/sales", salesRoutes);
    this.app.use("/api/customers", customersRoutes);
    
    // Rutas AFIP
    this.app.use("/api/afip", afipConfigRoutes);
    
    // Endpoint para ver configuración actual (solo en desarrollo)
    if (!this.isProduction) {
      this.app.get("/api/debug/config", (req: Request, res: Response) => {
        res.json({
          env: process.env.NODE_ENV,
          port: this.PORT,
          corsOrigin: process.env.FRONTEND_URL,
          allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
          afipMode: process.env.AFIP_MODE || "HOMOLOGACION",
        });
      });
    }

    // Documentación de API
    this.app.get("/api", (req: Request, res: Response) => {
      res.json({
        name: "POS Multitenant API",
        version: process.env.APP_VERSION || "1.0.0",
        endpoints: {
          health: "/api/health",
          auth: "/api/auth",
          categories: "/api/categories",
          products: "/api/products",
          employees: "/api/employees",
          suppliers: "/api/suppliers",
          sales: "/api/sales",
          customers: "/api/customers",
          afip: "/api/afip",
        },
        documentation: process.env.API_DOCS_URL || "https://docs.example.com",
      });
    });
  }

  private configureErrorHandling(): void {
    // Manejo de rutas no encontradas
    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: "Ruta no encontrada",
        path: req.originalUrl,
        method: req.method,
        requestId: req.id,
      });
    });

    // Middleware de manejo de errores
    this.app.use(errorHandler);

    // Manejo de errores no capturados
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      this.gracefulShutdown(1);
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      this.gracefulShutdown(1);
    });

    // Señales de sistema
    process.on("SIGTERM", () => {
      console.log("📍 SIGTERM signal received");
      this.gracefulShutdown(0);
    });

    process.on("SIGINT", () => {
      console.log("📍 SIGINT signal received");
      this.gracefulShutdown(0);
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Servicios AFIP ahora manejados por afip.ts
      console.log("✅ Servicios AFIP disponibles vía afip.ts");
    } catch (error) {
      console.error("❌ Error inicializando servicios:", error);
      // No es crítico, el servidor puede continuar
    }
  }

  public async start(): Promise<void> {
    try {
      // Conectar a la base de datos
      await this.prisma.$connect();
      console.log("✅ Conectado a la base de datos");

      // Inicializar servicios
      await this.initializeServices();

      // Crear servidor según el ambiente
      if (this.isProduction && process.env.SSL_CERT && process.env.SSL_KEY) {
        // Producción con HTTPS
        const https = await import("https");
        const fs = await import("fs");
        
        const httpsOptions = {
          cert: fs.readFileSync(process.env.SSL_CERT),
          key: fs.readFileSync(process.env.SSL_KEY),
          // Opciones de seguridad adicionales
          secureOptions: 
            (await import("constants")).SSL_OP_NO_TLSv1 | 
            (await import("constants")).SSL_OP_NO_TLSv1_1
        };
        
        this.server = https.createServer(httpsOptions, this.app);
        console.log("🔒 Servidor HTTPS configurado");
      } else {
        // Desarrollo con HTTP
        this.server = http.createServer(this.app);
        if (this.isProduction) {
          console.warn("⚠️ ADVERTENCIA: Ejecutando en producción sin HTTPS");
        }
      }

      // Iniciar servidor
      this.server.listen(this.PORT, () => {
        const protocol = this.isProduction && process.env.SSL_CERT ? "https" : "http";
        console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🚀 Servidor POS Multitenant iniciado            ║
║                                                    ║
║   Puerto: ${this.PORT}                                 ║
║   Protocolo: ${protocol.toUpperCase()}                           ║
║   Ambiente: ${process.env.NODE_ENV || 'development'}              ║
║   PID: ${process.pid}                                    ║
║                                                    ║
║   URLs:                                            ║
║   • API: ${protocol}://localhost:${this.PORT}/api             ║
║   • Health: ${protocol}://localhost:${this.PORT}/api/health   ║
║   • Prisma Studio: npx prisma studio              ║
║                                                    ║
╚════════════════════════════════════════════════════╝
        `);
      });

      // Configurar timeout para conexiones
      this.server.timeout = 30000; // 30 segundos
      this.server.keepAliveTimeout = 65000; // 65 segundos
      this.server.headersTimeout = 66000; // 66 segundos
    } catch (error) {
      console.error("❌ Error al iniciar el servidor:", error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(exitCode: number): Promise<void> {
    if (this.shutdownInProgress) {
      console.log("⏳ Shutdown already in progress...");
      return;
    }

    this.shutdownInProgress = true;
    console.log("\n🔄 Iniciando apagado graceful...");

    // Dar 10 segundos para cerrar todo
    const shutdownTimeout = setTimeout(() => {
      console.error("❌ Forzando cierre después de 10 segundos");
      process.exit(exitCode);
    }, 10000);

    try {
      // Detener aceptación de nuevas conexiones
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            console.log("✅ Servidor HTTP cerrado");
            resolve();
          });
        });
      }

      // AFIP services ya no requieren limpieza manual
      console.log("✅ Servicios AFIP finalizados");

      // Desconectar de la base de datos
      await this.prisma.$disconnect();
      console.log("✅ Desconectado de la base de datos");

      clearTimeout(shutdownTimeout);
      console.log("✅ Apagado graceful completado");
      process.exit(exitCode);
    } catch (error) {
      console.error("❌ Error durante el apagado:", error);
      clearTimeout(shutdownTimeout);
      process.exit(exitCode);
    }
  }
}

// Crear e iniciar servidor
const server = new Server();
server.start().catch((error) => {
  console.error("❌ Error fatal al iniciar:", error);
  process.exit(1);
});

export default server;