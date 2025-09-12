# 🚀 Despliegue Automático Mejorado - Stock Control

## Resumen de Mejoras

### ✅ Problemas Solucionados:
- **Eliminada duplicación** entre `docker-compose.prod.yml` y el workflow de GitHub Actions
- **Removido pgAdmin** innecesario de producción  
- **Configuración SSL/HTTPS** corregida con estructura Let's Encrypt
- **Gestión de certificados** automática con Certbot
- **Variables de entorno** centralizadas en `.env.prod`
- **Healthchecks** agregados para todos los servicios

---

## 🐳 Nueva Estructura Docker

### Servicios incluidos:
- **Frontend**: Next.js con Dockerfile.prod optimizado
- **Backend**: Express + TypeScript con healthchecks
- **PostgreSQL**: Con inicialización automática de shadow DB
- **Redis**: Para cache y sessions
- **Nginx**: Proxy reverso con SSL/TLS
- **Certbot**: Generación y renovación automática de certificados

### Cambios clave:
```yaml
# Ahora usa imágenes Alpine más livianas
postgres: postgres:16-alpine
redis: redis:7-alpine

# Healthchecks para todos los servicios
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 🔐 SSL/HTTPS Automático

### Configuración mejorada:
1. **Certificados temporales** se generan automáticamente en el primer deploy
2. **Let's Encrypt** disponible con `make ssl-generate`
3. **Renovación automática** con `make ssl-renew`
4. **Verificación** con `make ssl-info`

### Estructura SSL:
```
ssl/
└── live/
    └── stockcontrol.unlimitdevsoftware.com/
        ├── fullchain.pem
        └── privkey.pem
```

---

## 🔄 Workflow de Deploy Optimizado

### Flujo simplificado:
1. **Clone/Update** del repositorio
2. **Copia archivos** necesarios (no genera docker-compose duplicado)
3. **Variables de entorno** desde GitHub Secrets
4. **Certificados SSL** temporales si no existen
5. **Build y deploy** con healthchecks
6. **Migraciones** Prisma automáticas

### Variables de GitHub Secrets necesarias:
- `PROD_HOST`: IP del VPS de Hostinger
- `PROD_USERNAME`: Usuario SSH (ej: deploy)
- `PROD_DEPLOY_SSH_KEY`: Clave privada SSH
- `PROD_DB_PASSWORD`: Password de PostgreSQL
- `PROD_JWT_SECRET`: Secret para JWT tokens

---

## 📋 Comandos Makefile Nuevos

```bash
# SSL y certificados
make ssl-info          # Ver info de certificados actuales
make ssl-generate      # Generar certificados Let's Encrypt
make ssl-renew         # Renovar certificados existentes

# Monitoreo mejorado
make health           # Verificar salud de todos los servicios
make test-nginx       # Probar configuración Nginx

# Deploy local (para testing)
make deploy-local     # Deploy rápido desde local
```

---

## 🌐 URLs Después del Deploy

### HTTP (siempre disponible):
- `http://stockcontrol.unlimitdevsoftware.com`

### HTTPS:
- `https://stockcontrol.unlimitdevsoftware.com` (certificado temporal inicialmente)

### Para certificados reales:
1. Asegúrate de que el dominio apunte al VPS
2. Ejecuta: `make ssl-generate`
3. Reinicia: `make restart`

---

## 🔧 Próximos Pasos

1. **Hacer push** de estos cambios
2. **Verificar deploy** automático
3. **Generar certificados** SSL reales con `make ssl-generate`
4. **Configurar cron job** para renovación automática de SSL

### Cron job sugerido (en el VPS):
```bash
# Renovar certificados SSL cada 2 meses
0 0 1 */2 * cd /home/deploy/stockcontrol && make ssl-renew
```

---

## ⚡ Optimizaciones Incluidas

- **Imágenes Alpine** más livianas (-40% tamaño)
- **Build multistage** optimizado en Dockerfiles  
- **Healthchecks** para detección temprana de problemas
- **Rate limiting** configurado en Nginx
- **Gzip compression** para mejor rendimiento
- **Security headers** en todas las respuestas
- **Cleanup automático** de imágenes Docker viejas

El despliegue ahora es más rápido, seguro y confiable! 🎉