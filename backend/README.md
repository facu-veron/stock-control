# Sistema POS Multitenant con Facturación Electrónica AFIP

Sistema de punto de venta multitenant con integración a AFIP para facturación electrónica usando `afip.ts`.

## 🚀 Características Principales

- **Multitenant**: Aislamiento completo de datos por tenant
- **Facturación Electrónica AFIP**: Integración completa con `afip.ts`
- **Gestión de Inventario**: Control de stock y productos
- **Ventas**: Creación de ventas con facturación automática
- **Clientes**: Gestión de clientes con datos fiscales
- **Autenticación JWT**: Sistema de autenticación seguro
- **Base de Datos**: PostgreSQL con Prisma ORM

## 📋 Requisitos Previos

1. **Node.js** >= 18
2. **PostgreSQL** 
3. **Certificados AFIP** (producción o testing)
4. **CUIT** habilitado para facturación electrónica

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar en desarrollo
npm run dev
```

## ⚙️ Variables de Entorno

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/inventory_db"

# JWT
JWT_SECRET="tu_jwt_secret_muy_seguro"

# Servidor
PORT=3001
NODE_ENV=development

# AFIP (opcional para testing manual)
AFIP_CUIT=20123456789
AFIP_CERT_PATH=./certs/cert.pem
AFIP_KEY_PATH=./certs/private_key.pem
AFIP_PRODUCTION=false
```

## 🏗️ Configuración AFIP

### 1. Certificados AFIP

Coloca tus certificados en `/certs/`:
```
/certs/
  ├── cert.pem        # Certificado público
  └── private_key.pem # Clave privada
```

### 2. Configuración por Tenant

Cada tenant debe tener configurados sus credenciales AFIP:

**POST** `/api/afip/credentials`
```json
{
  "cuit": "20123456789",
  "certPem": "-----BEGIN CERTIFICATE-----\n...",
  "keyPem": "-----BEGIN PRIVATE KEY-----\n...",
  "isProduction": false
}
```

### 3. Configuración de Puntos de Venta

#### Opción A: Crear manualmente
**POST** `/api/afip/points-of-sale`
```json
{
  "number": 1,
  "description": "Punto de Venta Principal",
  "isActive": true
}
```

#### Opción B: Sincronizar desde AFIP
**POST** `/api/afip/points-of-sale/sync`

## 📡 Endpoints Principales

### Autenticación
```bash
# Login
POST /api/auth/login
{
  "email": "admin@empresa.com",
  "password": "password"
}
```

### Ventas con Facturación Electrónica

#### Crear Venta con Factura B (Consumidor Final)
**POST** `/api/sales/create`
```json
{
  "tipoFactura": "FACTURA_B",
  "puntoVenta": 1,
  "concepto": 1,
  "customer": {
    "documentType": "DNI",
    "documentNumber": "12345678",
    "taxStatus": "CONSUMIDOR_FINAL"
  },
  "items": [
    {
      "productName": "Producto Test",
      "quantity": 1,
      "unitPrice": 121.00
    }
  ],
  "subtotal": 100.00,
  "taxTotal": 21.00,
  "grandTotal": 121.00
}
```

#### Crear Venta con Factura A (Responsable Inscripto)
**POST** `/api/sales/create`
```json
{
  "tipoFactura": "FACTURA_A",
  "puntoVenta": 1,
  "concepto": 1,
  "customer": {
    "documentType": "CUIT",
    "documentNumber": "20123456789",
    "taxStatus": "RESPONSABLE_INSCRIPTO",
    "name": "Empresa Cliente SA",
    "email": "cliente@empresa.com",
    "address": "Dirección 123"
  },
  "items": [
    {
      "productName": "Servicio Profesional",
      "quantity": 1,
      "unitPrice": 100.00
    }
  ],
  "subtotal": 100.00,
  "taxTotal": 21.00,
  "grandTotal": 121.00
}
```

#### Crear Venta Sin Facturación (Ticket)
**POST** `/api/sales/create`
```json
{
  "tipoFactura": "TICKET",
  "items": [
    {
      "productName": "Producto",
      "quantity": 2,
      "unitPrice": 50.00
    }
  ],
  "subtotal": 100.00,
  "taxTotal": 21.00,
  "grandTotal": 121.00
}
```

### Gestión de Clientes

#### Crear Cliente
**POST** `/api/customers`
```json
{
  "name": "Juan Pérez",
  "documentType": "DNI",
  "documentNumber": "12345678",
  "taxStatus": "CONSUMIDOR_FINAL",
  "email": "juan@email.com",
  "phoneNumber": "+54911234567",
  "address": "Calle Falsa 123"
}
```

### Productos

#### Crear Producto
**POST** `/api/products`
```json
{
  "name": "Producto Test",
  "description": "Descripción del producto",
  "price": 121.00,
  "cost": 80.00,
  "stock": 100,
  "minStock": 10,
  "barcode": "1234567890123",
  "categoryId": "categoria_id",
  "supplierId": "proveedor_id"
}
```

## 🔧 Configuración AFIP Avanzada

### Tipos de Comprobante
- **1**: Factura A
- **6**: Factura B  
- **11**: Factura C

### Tipos de Documento
- **80**: CUIT
- **96**: DNI
- **99**: Consumidor Final

### Condiciones IVA del Receptor
- **1**: Responsable Inscripto
- **4**: Sujeto Exento
- **5**: Consumidor Final
- **6**: Responsable Monotributo
- **7**: No Categorizado

### Estados Fiscales del Cliente
```typescript
type CustomerTaxStatus = 
  | "RESPONSABLE_INSCRIPTO"
  | "MONOTRIBUTO"
  | "EXENTO"
  | "CONSUMIDOR_FINAL"
  | "NO_CATEGORIZADO"
```

## 🧪 Casos de Prueba

### Test 1: Factura B - Consumidor Final con DNI
```bash
curl -X POST http://localhost:3001/api/sales/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tipoFactura": "FACTURA_B",
    "puntoVenta": 1,
    "concepto": 1,
    "customer": {
      "documentType": "DNI",
      "documentNumber": "12345678",
      "taxStatus": "CONSUMIDOR_FINAL"
    },
    "items": [
      {
        "productName": "Producto Test",
        "quantity": 1,
        "unitPrice": 100.00
      }
    ],
    "subtotal": 100.00,
    "taxTotal": 21.00,
    "grandTotal": 121.00
  }'
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "message": "Venta creada y factura electrónica generada",
  "sale": {
    "id": "...",
    "cae": "67890123456789",
    "caeVto": "2025-09-03T00:00:00.000Z",
    "cbteNro": 1,
    "status": "COMPLETED"
  },
  "afip": {
    "cae": "67890123456789",
    "vencimiento": "20250903",
    "numero": 1
  }
}
```

### Test 2: Factura A - Responsable Inscripto
```bash
curl -X POST http://localhost:3001/api/sales/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tipoFactura": "FACTURA_A",
    "puntoVenta": 1,
    "concepto": 1,
    "customer": {
      "documentType": "CUIT",
      "documentNumber": "20123456789",
      "taxStatus": "RESPONSABLE_INSCRIPTO",
      "name": "Empresa SA"
    },
    "items": [
      {
        "productName": "Servicio",
        "quantity": 1,
        "unitPrice": 100.00
      }
    ],
    "subtotal": 100.00,
    "taxTotal": 21.00,
    "grandTotal": 121.00
  }'
```

### Test 3: Obtener Puntos de Venta
```bash
curl -X GET http://localhost:3001/api/afip/points-of-sale \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 4: Consultar Comprobante
```bash
curl -X GET "http://localhost:3001/api/afip/voucher?number=1&salePoint=1&type=6" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ❌ Errores Comunes y Soluciones

### Error 10246: "Campo Condicion Frente al IVA del receptor es obligatorio"
**Causa**: Falta el campo `CondicionIVAReceptorId` en la request a AFIP.
**Solución**: 
- Asegurar que el cliente tenga `taxStatus` correcto
- Verificar que se esté mapeando correctamente en `afip.service.ts`

### Error 10013: "No existe una solicitud de CAE de Comprobantes Electrónicos" 
**Causa**: El punto de venta no está habilitado para ese tipo de comprobante.
**Solución**: 
- Verificar en AFIP que el punto de venta esté habilitado
- Sincronizar puntos de venta: `POST /api/afip/points-of-sale/sync`

### Error 10015: "El punto de venta no se encuentra habilitado"
**Causa**: Punto de venta no configurado en AFIP.
**Solución**: 
- Crear punto de venta en portal AFIP
- Sincronizar: `POST /api/afip/points-of-sale/sync`

### Error 602: "Sin Resultados"
**Causa**: No hay datos para mostrar (ej: puntos de venta).
**Solución**: 
- Configurar puntos de venta en AFIP
- El sistema maneja este error devolviendo array vacío

### CAE Vacío/Null
**Causa**: AFIP rechazó la factura por errores de validación.
**Solución**: 
- Revisar `afipError` en la respuesta
- Verificar datos del cliente y estado fiscal
- Para Factura A, el cliente DEBE tener CUIT

### Error de Multitenancy
**Causa**: Datos se están cruzando entre tenants.
**Solución**: 
- Verificar que todas las queries incluyan `tenantId`
- Revisar middleware de autenticación

## 🔒 Seguridad Multitenant

### Aislamiento de Datos
- Todas las operaciones filtran por `tenantId`
- JWT incluye información del tenant
- Middleware valida permisos por tenant

### Validaciones
```typescript
// Ejemplo de validación en controllers
const { tenantId } = req.user;
const sale = await prisma.sale.findFirst({
  where: { 
    id: saleId,
    tenantId // ¡CRÍTICO: Siempre incluir tenantId!
  }
});
```

## 📊 Estructura de Respuestas

### Venta Exitosa
```json
{
  "success": true,
  "message": "Venta creada y factura electrónica generada",
  "sale": {
    "id": "...",
    "tenantId": "...",
    "cae": "67890123456789",
    "caeVto": "2025-09-03T00:00:00.000Z",
    "cbteNro": 1,
    "status": "COMPLETED",
    "afipStatus": null,
    "afipError": null
  },
  "afip": {
    "cae": "67890123456789",
    "vencimiento": "20250903", 
    "numero": 1
  }
}
```

### Venta con Error AFIP
```json
{
  "success": true,
  "warning": "Venta creada pero hubo un error con AFIP",
  "sale": {
    "id": "...",
    "cae": null,
    "caeVto": null,
    "status": "DRAFT",
    "afipError": "Factura rechazada por AFIP. Errores: [...]"
  }
}
```

## 🚨 Troubleshooting

### Debug AFIP
Los logs incluyen información detallada:
```
🔄 Iniciando facturación electrónica para tenant: xxx
📋 Datos de factura: {...}
🏢 Tenant encontrado: empresa CUIT: 20123456789
🔍 Resolviendo CondicionIVAReceptorId: {...}
✅ Heurística por DocTipo (99/96 - CF): 5
📝 Datos de factura a enviar a AFIP: {...}
🚀 Enviando factura a AFIP...
✅ Respuesta de AFIP: {...}
```

### Verificar Configuración
1. **Credenciales AFIP**: `GET /api/afip/credentials`
2. **Puntos de Venta**: `GET /api/afip/points-of-sale`
3. **Última factura**: `GET /api/afip/last-voucher?salePoint=1&type=6`

### Testing Environment
- Usar certificados de testing de AFIP
- `isProduction: false` en credenciales
- Los CAE de testing NO son válidos en producción

## 📈 Monitoreo

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Logs importantes
- Errores AFIP se registran en consola
- Ventas con errores se marcan como `DRAFT`
- Auditoría completa en tabla `AuditLog`

---

**Importante**: Este es un sistema multitenant. NUNCA omitas el `tenantId` en las queries para evitar cruces de datos entre clientes.