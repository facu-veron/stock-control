# Makefile para Stock Control - Producción
# Uso: make <comando>

.PHONY: help up down restart status logs logs-follow clean migrate db-reset backup ssl-generate ssl-renew

# Variables
COMPOSE_FILE = docker-compose.prod.yml
ENV_FILE = .env.prod
DOMAIN = stockcontrol.unlimitdevsoftware.com

# Help - mostrar comandos disponibles
help:
	@echo "📋 Comandos disponibles para Stock Control (Producción):"
	@echo ""
	@echo "🚀 Servicios:"
	@echo "  make up          - Levantar todos los servicios"
	@echo "  make down        - Detener todos los servicios"
	@echo "  make restart     - Reiniciar todos los servicios"
	@echo "  make build       - Construir imágenes sin cache"
	@echo "  make rebuild     - Reconstruir y levantar servicios"
	@echo ""
	@echo "📊 Monitoreo:"
	@echo "  make status      - Ver estado de contenedores"
	@echo "  make logs        - Ver logs de todos los servicios"
	@echo "  make logs-nginx  - Ver logs de Nginx"
	@echo "  make logs-front  - Ver logs del Frontend"
	@echo "  make logs-back   - Ver logs del Backend"
	@echo "  make logs-db     - Ver logs de PostgreSQL"
	@echo "  make follow      - Seguir logs en tiempo real"
	@echo ""
	@echo "🐳 Contenedores:"
	@echo "  make shell-nginx - Entrar al contenedor Nginx"
	@echo "  make shell-front - Entrar al contenedor Frontend"
	@echo "  make shell-back  - Entrar al contenedor Backend"
	@echo "  make shell-db    - Entrar al contenedor PostgreSQL"
	@echo ""
	@echo "🗄️ Base de Datos:"
	@echo "  make migrate     - Ejecutar migraciones Prisma"
	@echo "  make db-studio   - Abrir Prisma Studio"
	@echo "  make db-backup   - Crear backup de la BD"
	@echo "  make db-status   - Ver estado de la BD"
	@echo ""
	@echo "🧹 Limpieza:"
	@echo "  make clean       - Limpiar imágenes no utilizadas"
	@echo "  make clean-all   - Limpieza completa (peligroso)"
	@echo "  make prune       - Eliminar contenedores parados"
	@echo ""
	@echo "🔧 Desarrollo:"
	@echo "  make test-nginx  - Probar configuración Nginx"
	@echo "  make ssl-info    - Información de certificados SSL"
	@echo "  make ssl-generate- Generar certificados Let's Encrypt"
	@echo "  make ssl-renew   - Renovar certificados SSL"
	@echo "  make health      - Verificar salud de servicios"

# Servicios principales
up:
	@echo "🚀 Levantando servicios..."
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d

down:
	@echo "🛑 Deteniendo servicios..."
	docker-compose -f $(COMPOSE_FILE) down

restart:
	@echo "🔄 Reiniciando servicios..."
	make down
	sleep 5
	make up

build:
	@echo "🔨 Construyendo imágenes..."
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) build --no-cache

rebuild:
	@echo "🔨 Reconstruyendo y levantando servicios..."
	make down
	make build
	make up

# Monitoreo
status:
	@echo "📊 Estado de contenedores:"
	docker-compose -f $(COMPOSE_FILE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "💾 Uso de recursos:"
	docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

logs:
	@echo "📋 Logs de todos los servicios:"
	docker-compose -f $(COMPOSE_FILE) logs --tail=50

logs-nginx:
	@echo "📋 Logs de Nginx:"
	docker-compose -f $(COMPOSE_FILE) logs --tail=100 nginx

logs-front:
	@echo "📋 Logs del Frontend:"
	docker-compose -f $(COMPOSE_FILE) logs --tail=100 frontend

logs-back:
	@echo "📋 Logs del Backend:"
	docker-compose -f $(COMPOSE_FILE) logs --tail=100 backend

logs-db:
	@echo "📋 Logs de PostgreSQL:"
	docker-compose -f $(COMPOSE_FILE) logs --tail=100 postgres

follow:
	@echo "👀 Siguiendo logs en tiempo real (Ctrl+C para salir):"
	docker-compose -f $(COMPOSE_FILE) logs --follow

# Contenedores (shells)
shell-nginx:
	@echo "🐚 Entrando al contenedor Nginx..."
	docker-compose -f $(COMPOSE_FILE) exec nginx sh

shell-front:
	@echo "🐚 Entrando al contenedor Frontend..."
	docker-compose -f $(COMPOSE_FILE) exec frontend sh

shell-back:
	@echo "🐚 Entrando al contenedor Backend..."
	docker-compose -f $(COMPOSE_FILE) exec backend sh

shell-db:
	@echo "🐚 Entrando al contenedor PostgreSQL..."
	docker-compose -f $(COMPOSE_FILE) exec postgres psql -U stockcontrol_user -d stockcontrol_prod_db

# Base de datos
migrate:
	@echo "🗄️ Ejecutando migraciones Prisma..."
	docker-compose -f $(COMPOSE_FILE) exec backend npx prisma migrate deploy

db-studio:
	@echo "🎨 Abriendo Prisma Studio..."
	@echo "Disponible en: http://localhost:5555"
	docker-compose -f $(COMPOSE_FILE) exec -d backend npx prisma studio --port 5555 --hostname 0.0.0.0

db-backup:
	@echo "💾 Creando backup de la base de datos..."
	@mkdir -p ./backups
	docker-compose -f $(COMPOSE_FILE) exec postgres pg_dump -U stockcontrol_user stockcontrol_prod_db > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup creado en ./backups/"

db-status:
	@echo "🗄️ Estado de la base de datos:"
	docker-compose -f $(COMPOSE_FILE) exec postgres psql -U stockcontrol_user -d stockcontrol_prod_db -c "\l"
	@echo ""
	docker-compose -f $(COMPOSE_FILE) exec postgres psql -U stockcontrol_user -d stockcontrol_prod_db -c "SELECT current_database(), current_user, now();"

# Limpieza
clean:
	@echo "🧹 Limpiando imágenes no utilizadas..."
	docker image prune -f
	@echo "✅ Limpieza completada"

clean-all:
	@echo "⚠️  PELIGRO: Esto eliminará TODOS los contenedores, imágenes y volúmenes no utilizados"
	@read -p "¿Estás seguro? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker system prune -af --volumes
	@echo "✅ Limpieza completa realizada"

prune:
	@echo "🧹 Eliminando contenedores parados..."
	docker container prune -f

# Herramientas de desarrollo
test-nginx:
	@echo "🔧 Probando configuración de Nginx..."
	docker-compose -f $(COMPOSE_FILE) exec nginx nginx -t

ssl-info:
	@echo "🔐 Información de certificados SSL:"
	@if [ -f "./ssl/live/$(DOMAIN)/fullchain.pem" ]; then \
		echo "📋 Certificado encontrado:"; \
		openssl x509 -in ./ssl/live/$(DOMAIN)/fullchain.pem -text -noout | grep -A2 "Subject:" || echo "No se pudo leer el certificado"; \
		echo ""; \
		echo "📅 Fecha de expiración:"; \
		openssl x509 -in ./ssl/live/$(DOMAIN)/fullchain.pem -enddate -noout || echo "No se pudo leer fecha"; \
	else \
		echo "❌ No se encontró certificado SSL en ./ssl/live/$(DOMAIN)/fullchain.pem"; \
		echo "   Ejecuta 'make ssl-generate' para generar certificados"; \
	fi

ssl-generate:
	@echo "🔐 Generando certificados SSL con Let's Encrypt..."
	@echo "⚠️  Asegúrate de que el dominio $(DOMAIN) apunte a este servidor"
	@read -p "¿Continuar? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	
	# Detener nginx temporalmente
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) stop nginx
	
	# Ejecutar certbot
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) run --rm certbot
	
	# Reiniciar nginx
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) start nginx
	
	@echo "✅ Certificados generados. Verifica con 'make ssl-info'"

ssl-renew:
	@echo "🔄 Renovando certificados SSL..."
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) run --rm certbot renew
	docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) restart nginx
	@echo "✅ Certificados renovados"

health:
	@echo "🏥 Verificando salud de servicios..."
	@echo "🔍 Nginx:"
	@curl -s -I http://localhost:80/nginx-health | head -1 || echo "❌ Nginx no responde"
	@echo "🔍 Frontend (interno):"
	@docker-compose -f $(COMPOSE_FILE) exec frontend wget -qO- http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend no responde"
	@echo "🔍 Backend (interno):"
	@docker-compose -f $(COMPOSE_FILE) exec backend wget -qO- http://localhost:3001/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend no responde"
	@echo "🔍 PostgreSQL:"
	@docker-compose -f $(COMPOSE_FILE) exec postgres pg_isready -U stockcontrol_user && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL no responde"
	@echo "🔍 Redis:"
	@docker-compose -f $(COMPOSE_FILE) exec redis redis-cli ping | grep PONG > /dev/null && echo "✅ Redis OK" || echo "❌ Redis no responde"
	@echo "🔐 SSL Status:"
	@if [ -f "./ssl/live/$(DOMAIN)/fullchain.pem" ]; then \
		echo "✅ SSL Certificados encontrados"; \
		openssl x509 -in ./ssl/live/$(DOMAIN)/fullchain.pem -enddate -noout 2>/dev/null || echo "⚠️ Error leyendo certificado"; \
	else \
		echo "ℹ️ SSL no configurado (usando HTTP)"; \
	fi

# Deploy rápido desde local (para testing)
deploy-local:
	@echo "🚀 Deploy local rápido..."
	git pull origin main
	make down
	make build
	make up
	sleep 30
	make migrate
	make status