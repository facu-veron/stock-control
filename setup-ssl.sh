#!/bin/bash

# Script de post-deploy para configurar SSL real
# Ejecuta este script después del primer deploy exitoso

echo "🔐 Configurando certificados SSL reales con Let's Encrypt..."

# Directorio de trabajo
cd /home/deploy/stockcontrol

# Verificar que el dominio apunte al servidor
echo "📡 Verificando DNS del dominio..."
DOMAIN_IP=$(dig +short stockcontrol.unlimitdevsoftware.com)
SERVER_IP=$(curl -s ifconfig.me)

echo "🔍 IP del dominio: $DOMAIN_IP"
echo "🔍 IP del servidor: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  ADVERTENCIA: El dominio no apunta a este servidor"
    echo "   Configura el DNS antes de continuar"
    read -p "¿Continuar de todos modos? (y/N): " confirm
    [ "$confirm" != "y" ] && exit 1
fi

# Detener nginx temporalmente
echo "🛑 Deteniendo Nginx para obtener certificados..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod stop nginx

# Obtener certificados Let's Encrypt
echo "📜 Obteniendo certificados SSL..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod run --rm --entrypoint "\
    certbot certonly --standalone \
    --email admin@unlimitdevsoftware.com \
    --agree-tos \
    --no-eff-email \
    -d stockcontrol.unlimitdevsoftware.com \
    -d unlimitdevsoftware.com" certbot

# Verificar que se generaron los certificados
if [ -f "ssl/live/stockcontrol.unlimitdevsoftware.com/fullchain.pem" ]; then
    echo "✅ Certificados SSL generados exitosamente"
    
    # Reiniciar nginx
    echo "🔄 Reiniciando Nginx con SSL..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod start nginx
    
    # Verificar estado
    sleep 10
    docker-compose -f docker-compose.prod.yml --env-file .env.prod ps nginx
    
    # Probar HTTPS
    echo "🧪 Probando HTTPS..."
    curl -I https://stockcontrol.unlimitdevsoftware.com || echo "❌ HTTPS no responde aún"
    
    echo "🎉 SSL configurado exitosamente!"
    echo ""
    echo "🌐 URLs disponibles:"
    echo "   HTTP:  http://stockcontrol.unlimitdevsoftware.com (redirige a HTTPS)"
    echo "   HTTPS: https://stockcontrol.unlimitdevsoftware.com"
    
else
    echo "❌ Error al generar certificados SSL"
    echo "🔄 Reiniciando con certificados temporales..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod start nginx
    exit 1
fi

# Configurar renovación automática
echo "⏰ Configurando renovación automática de certificados..."
(crontab -l 2>/dev/null; echo "0 0 1 */2 * cd /home/deploy/stockcontrol && docker-compose -f docker-compose.prod.yml --env-file .env.prod run --rm certbot renew && docker-compose -f docker-compose.prod.yml --env-file .env.prod restart nginx") | crontab -

echo "✅ Configuración SSL completa!"