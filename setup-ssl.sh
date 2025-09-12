#!/bin/bash

# Script de post-deploy para configurar SSL real
# Ejecuta este script después del primer deploy exitoso

echo "🔐 Configurando certificados SSL reales con Let's Encrypt..."

# Directorio de trabajo
cd /home/deploy/stockcontrol

# Verificar que el dominio apunte al servidor
echo "📡 Verificando DNS del dominio..."
DOMAIN_IP=$(dig +short stockcontrol.unlimitdevsoftware.com)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

echo "🔍 IP del dominio: $DOMAIN_IP"
echo "🔍 IP del servidor: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ] && [ "$DOMAIN_IP" != "" ]; then
    echo "⚠️  ADVERTENCIA: El dominio no apunta a este servidor"
    echo "   Configura el DNS antes de continuar"
    read -p "¿Continuar de todos modos? (y/N): " confirm
    [ "$confirm" != "y" ] && exit 1
fi

# Verificar que nginx esté corriendo con HTTP
echo "🔍 Verificando que la aplicación funcione por HTTP..."
if ! curl -s http://localhost/nginx-health > /dev/null; then
    echo "❌ La aplicación no responde por HTTP. Deploy primero la aplicación."
    echo "   Ejecuta: make up"
    exit 1
fi

# Detener nginx temporalmente para obtener certificados
echo "🛑 Deteniendo Nginx para obtener certificados..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod stop nginx

# Obtener certificados Let's Encrypt
echo "📜 Obteniendo certificados SSL..."
docker run --rm -v "./ssl:/etc/letsencrypt" -v "./ssl/webroot:/var/www/certbot" \
    -p 80:80 certbot/certbot \
    certonly --standalone \
    --email admin@unlimitdevsoftware.com \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d stockcontrol.unlimitdevsoftware.com

# Verificar que se generaron los certificados
if [ -f "ssl/live/stockcontrol.unlimitdevsoftware.com/fullchain.pem" ]; then
    echo "✅ Certificados SSL generados exitosamente"
    
    # Reiniciar nginx (la configuración unificada detectará automáticamente SSL)
    echo "🔄 Reiniciando servicios con SSL automático..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod start nginx
    
    # Verificar estado
    sleep 10
    docker-compose -f docker-compose.prod.yml --env-file .env.prod ps
    
    echo "🎉 SSL configurado exitosamente!"
    echo ""
    echo "🌐 URLs disponibles:"
    echo "   HTTP:  http://stockcontrol.unlimitdevsoftware.com (redirige automáticamente a HTTPS)"
    echo "   HTTPS: https://stockcontrol.unlimitdevsoftware.com"
    
else
    echo "❌ Error al generar certificados SSL"
    echo "🔄 Reiniciando con configuración HTTP..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod start nginx
    exit 1
fi

# Configurar renovación automática
echo "⏰ Configurando renovación automática de certificados..."
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 2 * * 1 cd /home/deploy/stockcontrol && docker run --rm -v './ssl:/etc/letsencrypt' -v './ssl/webroot:/var/www/certbot' certbot/certbot renew --quiet && docker-compose -f docker-compose.prod.yml --env-file .env.prod restart nginx") | crontab -

echo "✅ Configuración SSL completa!"