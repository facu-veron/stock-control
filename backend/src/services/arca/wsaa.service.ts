// src/services/afip/wsaa.service.ts
import { prisma } from "../../lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import soap from "soap";
import { parseString } from "xml2js";
import { promisify as promisifyXml } from "util";

const execAsync = promisify(exec);
const parseXmlAsync = promisifyXml(parseString);

interface WsaaConfig {
  certPath: string;
  keyPath: string;
  service: string;
  wsaaUrl: string;
}

interface TokenResponse {
  token: string;
  sign: string;
  generationTime: Date;
  expirationTime: Date;
}

export class WsaaService {
  private readonly TEMP_DIR = path.join(process.cwd(), "temp", "afip");
  private readonly WSAA_URLS = {
    HOMOLOGACION: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL",
    PRODUCCION: "https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL"
  };
  
  // Cache en memoria para tokens (opcional para mejorar performance)
  private tokenCache = new Map<string, { token: TokenResponse; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating temp directory:", error);
    }
  }

  /**
   * Obtiene o renueva el token de acceso para un tenant
   */
  async getOrRenewToken(tenantId: string, forceRenew = false): Promise<TokenResponse | null> {
    try {
      // Verificar cache en memoria primero (si no se fuerza renovación)
      if (!forceRenew) {
        const cached = this.tokenCache.get(tenantId);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
          const expiration = new Date(cached.token.expirationTime);
          const buffer = 5 * 60 * 1000; // 5 minutos de buffer
          
          if (expiration.getTime() - buffer > Date.now()) {
            console.log(`✅ Token desde cache para tenant ${tenantId}`);
            return cached.token;
          }
        }
      }

      // Obtener las credenciales del tenant
      const credential = await prisma.afipCredential.findUnique({
        where: { tenantId },
        include: { 
          token: true,
          tenant: true 
        }
      });

      if (!credential) {
        throw new Error(`No se encontraron credenciales AFIP para el tenant ${tenantId}`);
      }

      // Verificar si el token actual es válido
      if (!forceRenew && credential.token) {
        const now = new Date();
        const expiration = new Date(credential.token.expirationTime);
        const buffer = 5 * 60 * 1000; // 5 minutos de buffer
        
        if (expiration.getTime() - buffer > now.getTime()) {
          console.log(`✅ Token válido para tenant ${tenantId}, expira: ${expiration}`);
          const tokenResponse = {
            token: credential.token.token,
            sign: credential.token.sign,
            generationTime: credential.token.generationTime,
            expirationTime: credential.token.expirationTime
          };
          
          // Actualizar cache
          this.tokenCache.set(tenantId, { 
            token: tokenResponse, 
            timestamp: Date.now() 
          });
          
          return tokenResponse;
        }
      }

      console.log(`🔄 Renovando token para tenant ${tenantId}...`);
      
      // Generar nuevo token
      const wsaaUrl = credential.tenant.mode === "PRODUCCION" 
        ? this.WSAA_URLS.PRODUCCION 
        : this.WSAA_URLS.HOMOLOGACION;

      const newToken = await this.generateToken({
        certPath: await this.saveTempFile(credential.certPem, `cert_${tenantId}.pem`),
        keyPath: await this.saveTempFile(credential.keyPem, `key_${tenantId}.pem`),
        service: credential.service,
        wsaaUrl
      });

      // Guardar el nuevo token en la base de datos
      if (newToken) {
        await prisma.afipToken.upsert({
          where: { credentialId: credential.id },
          create: {
            credentialId: credential.id,
            token: newToken.token,
            sign: newToken.sign,
            generationTime: newToken.generationTime,
            expirationTime: newToken.expirationTime,
            rawXml: null
          },
          update: {
            token: newToken.token,
            sign: newToken.sign,
            generationTime: newToken.generationTime,
            expirationTime: newToken.expirationTime,
            updatedAt: new Date()
          }
        });

        // Actualizar cache
        this.tokenCache.set(tenantId, { 
          token: newToken, 
          timestamp: Date.now() 
        });

        console.log(`✅ Token renovado para tenant ${tenantId}`);
        return newToken;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo token para tenant ${tenantId}:`, error);
      throw error;
    } finally {
      // Limpiar archivos temporales
      await this.cleanupTempFiles();
    }
  }

  /**
   * Limpia el cache de tokens (útil para forzar renovación)
   */
  clearTokenCache(tenantId?: string): void {
    if (tenantId) {
      this.tokenCache.delete(tenantId);
      console.log(`🧹 Cache limpiado para tenant ${tenantId}`);
    } else {
      this.tokenCache.clear();
      console.log(`🧹 Cache de tokens completamente limpiado`);
    }
  }

  /**
   * Genera un nuevo token de acceso
   */
  private async generateToken(config: WsaaConfig): Promise<TokenResponse | null> {
    try {
      const timestamp = Date.now();
      
      // Paso 1: Crear el Ticket Request XML
      const ticketRequest = this.createTicketRequest(config.service);
      const xmlPath = path.join(this.TEMP_DIR, `tra_${timestamp}.xml`);
      await fs.writeFile(xmlPath, ticketRequest, "utf8");

      // Paso 2: Firmar con OpenSSL para crear el CMS
      const cmsPath = path.join(this.TEMP_DIR, `tra_${timestamp}.cms`);
      const signCommand = `openssl cms -sign -in "${xmlPath}" -signer "${config.certPath}" -inkey "${config.keyPath}" -nodetach -outform der -out "${cmsPath}"`;
      await execAsync(signCommand);

      // Paso 3: Codificar en Base64
      const cmsBase64Path = path.join(this.TEMP_DIR, `tra_${timestamp}_b64.cms`);
      const encodeCommand = `openssl base64 -in "${cmsPath}" -e -out "${cmsBase64Path}"`;
      await execAsync(encodeCommand);

      // Paso 4: Leer el CMS codificado
      const cms = await fs.readFile(cmsBase64Path, "utf8");

      // Paso 5: Invocar al WSAA
      const response = await this.callWsaa(config.wsaaUrl, cms);
      
      if (response) {
        return this.parseTokenResponse(response);
      }

      return null;
    } catch (error) {
      console.error("Error generando token:", error);
      throw error;
    }
  }

  /**
   * Crea el XML del Ticket Request
   */
  private createTicketRequest(service: string): string {
    const now = new Date();
    const generationTime = new Date(now.getTime() - 10 * 60 * 1000); // -10 minutos
    const expirationTime = new Date(now.getTime() + 10 * 60 * 1000); // +10 minutos
    const uniqueId = now.getTime();

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime.toISOString().split('.')[0]}</generationTime>
    <expirationTime>${expirationTime.toISOString().split('.')[0]}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
  }

  /**
   * Llama al servicio WSAA con reintentos
   */
  private async callWsaa(wsaaUrl: string, cms: string, retries = 3): Promise<string | null> {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await soap.createClientAsync(wsaaUrl);
        const [result] = await client.loginCmsAsync({ in0: cms });
        return result.loginCmsReturn;
      } catch (error) {
        lastError = error;
        console.error(`Intento ${attempt}/${retries} falló:`, error);
        
        if (attempt < retries) {
          // Espera exponencial: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error("Todos los intentos de conexión con WSAA fallaron:", lastError);
    return null;
  }

  /**
   * Parsea la respuesta del token
   */
  private async parseTokenResponse(xmlResponse: string): Promise<TokenResponse | null> {
    try {
      const result = await parseXmlAsync(xmlResponse) as any;
      const credentials = result.loginTicketResponse.credentials[0];
      
      return {
        token: credentials.token[0],
        sign: credentials.sign[0],
        generationTime: new Date(result.loginTicketResponse.header[0].generationTime[0]),
        expirationTime: new Date(result.loginTicketResponse.header[0].expirationTime[0])
      };
    } catch (error) {
      console.error("Error parseando respuesta del token:", error);
      return null;
    }
  }

  /**
   * Guarda contenido en un archivo temporal
   */
  private async saveTempFile(content: string, filename: string): Promise<string> {
    const filePath = path.join(this.TEMP_DIR, filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * Limpia archivos temporales
   */
  private async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.TEMP_DIR);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hora

      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error("Error limpiando archivos temporales:", error);
    }
  }

  /**
   * Renueva tokens para todos los tenants activos
   */
  async renewAllTokens(): Promise<void> {
    console.log("🔄 Iniciando renovación de tokens AFIP para todos los tenants...");
    
    const credentials = await prisma.afipCredential.findMany({
      include: {
        tenant: true,
        token: true
      }
    });

    for (const credential of credentials) {
      try {
        const now = new Date();
        const shouldRenew = !credential.token || 
          new Date(credential.token.expirationTime).getTime() - (30 * 60 * 1000) < now.getTime();

        if (shouldRenew) {
          await this.getOrRenewToken(credential.tenantId, true);
          console.log(`✅ Token renovado para: ${credential.tenant.name}`);
        } else {
          console.log(`⏭️ Token aún válido para: ${credential.tenant.name}`);
        }
      } catch (error) {
        console.error(`❌ Error renovando token para ${credential.tenant.name}:`, error);
      }
    }

    console.log("✅ Proceso de renovación completado");
  }
}

export const wsaaService = new WsaaService();

export async function getOrRenewTA(tenantId: string, forceRenew = false) {
  return wsaaService.getOrRenewToken(tenantId, forceRenew);
}

// opcional, por si lo usás
export async function renewAllWsaaTokens() {
  return wsaaService.renewAllTokens();
}