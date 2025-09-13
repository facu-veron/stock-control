# Stock Control - Deploy Guide

## 🚀 Deploy Automático a VPS con GitHub Actions

### Configuración Inicial

#### 1. **GitHub Secrets** (Obligatorio)
En tu repositorio → Settings → Secrets and variables → Actions, agrega:

| Name | Value |
|------|-------|
| `VPS_HOST` | `193.203.182.87` |
| `VPS_SSH_KEY` | `[tu clave privada SSH]` |
| `DB_PASSWORD` | `[password seguro]` |
| `JWT_SECRET` | `[JWT secret seguro]` |
| `AFIP_MODE` | `PRODUCCION` |
| `DOMAIN` | `unlimitdevsoftware.com` |
| `DOCKER_USERNAME` | `facuveron` |

#### 2. **DNS Configuration** (Obligatorio)
En tu panel DNS agregar estos registros:

```
A    api                -> 193.203.182.87
A    *                  -> 193.203.182.87
```

### 📋 URLs de la Aplicación

- **App Principal**: https://stockcontrol.unlimitdevsoftware.com
- **API Backend**: https://api.unlimitdevsoftware.com
- **Multitenant**: https://[tenant].unlimitdevsoftware.com
- **Health Check**: https://api.unlimitdevsoftware.com/api/health

### 🔧 Deploy Process

1. **Configurar Secrets** ✅
2. **Agregar DNS Records** ✅  
3. **Push a main branch**:
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

### 📁 Estructura del Servidor

```
/home/deploy/apps/stock-control/
├── docker-compose.prod.yml
├── .env (generado automáticamente)
├── caddy/
│   └── Caddyfile
└── /home/deploy/certs/
    ├── cert.pem (AFIP)
    └── private_key.pem (AFIP)
```

### 🛠️ Comandos Útiles en el Servidor

```bash
# Ver estado de contenedores
cd /home/deploy/apps/stock-control
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
docker compose -f docker-compose.prod.yml restart

# Health check
curl https://api.unlimitdevsoftware.com/api/health
```

### 🔍 Troubleshooting

#### Si el deploy falla:
1. Verificar que todos los GitHub Secrets estén configurados
2. Verificar que los DNS records estén propagados: `nslookup api.unlimitdevsoftware.com`
3. Verificar logs en el servidor: `docker compose -f docker-compose.prod.yml logs`

#### Si SSL/HTTPS no funciona:
- Caddy genera certificados automáticamente
- Verificar que los DNS apunten correctamente
- Esperar propagación DNS (puede tardar hasta 24h)

### 🏢 Multitenant Setup

Para agregar un nuevo tenant:
1. Crear subdominio DNS: `A tenant1 -> 193.203.182.87`
2. La aplicación manejará automáticamente el tenant basado en el subdominio

### 🔐 Certificados AFIP

Subir certificados al servidor:
```bash
scp cert.pem deploy@193.203.182.87:/home/deploy/certs/
scp private_key.pem deploy@193.203.182.87:/home/deploy/certs/
```

### 📊 Monitoreo

- **Health Check**: Automático en el GitHub Action
- **Logs**: `docker compose logs -f`
- **Base de Datos**: Respaldos automáticos configurados en crontab

---

## 🏃‍♂️ Quick Start

1. Configurar GitHub Secrets ⚡
2. Agregar DNS Records ⚡
3. `git push origin main` ⚡
4. ¡Listo! 🎉